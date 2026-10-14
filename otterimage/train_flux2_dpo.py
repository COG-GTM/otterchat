"""Diffusion-DPO post-training of an otterimage FLUX.2 LoRA on ottervote preferences.

Starts from the SFT LoRA in <model-dir>/otterimage/<session-id> (train_flux2_lora.py output), which is
also the frozen reference, and trains it so the voted winner of each pair gets a lower flow-matching
error than the loser, relative to the reference. Reference errors are precomputed with the same seeded
noise/timestep the policy sees later, so only one transformer is ever in memory.

Needs the FLUX.2 base weights under --model-dir and INGEST_TOKEN for ottervote's /api/export.

    python otterimage/train_flux2_dpo.py --vote-url https://<ottervote-host> --lora-version otterimage-1.0
    python otterimage/train_flux2_dpo.py --pairs-json pairs.json   # [{prompt, winnerUrl, loserUrl}, ...]
"""

from __future__ import annotations

import argparse
import io
import json
import os
import random
import subprocess
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
TARGET_MODULES = ["to_k", "to_q", "to_v", "to_out.0", "to_qkv_mlp_proj"] + [
    f"single_transformer_blocks.{i}.attn.to_out" for i in range(48)
]


def parse_args() -> argparse.Namespace:
    import yaml

    config = yaml.safe_load((HERE / "train_config.yaml").read_text())
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model-dir", default="/model")
    p.add_argument("--session-id", default=os.environ.get("DEVIN_OUTPOST_SESSION_ID"), help="whose SFT LoRA to start from")
    p.add_argument("--output-dir", help="defaults to <model-dir>/otterimage/<session-id>/dpo")
    p.add_argument("--vote-url", help="ottervote base URL; reads GET /api/export with $INGEST_TOKEN")
    p.add_argument("--pairs-json", help="local export instead of --vote-url")
    p.add_argument("--lora-version", default="otterimage-1.0")
    p.add_argument("--min-pairs", type=int, default=50)
    p.add_argument("--resolution", type=int, default=config["resolution"])
    p.add_argument("--rank", type=int, default=config["rank"])
    p.add_argument("--lora-alpha", type=int, default=config["lora_alpha"])
    p.add_argument("--beta", type=float, default=2500.0, help="DPO KL strength; higher stays closer to the SFT LoRA")
    p.add_argument("--learning-rate", type=float, default=1e-5)
    p.add_argument("--gradient-accumulation-steps", type=int, default=4)
    p.add_argument("--repeats", type=int, default=4, help="noise/timestep draws per pair")
    p.add_argument("--max-train-steps", type=int, default=200)
    p.add_argument("--checkpointing-steps", type=int, default=50)
    p.add_argument("--guidance-scale", type=float, default=1.0, help="matches train_flux2_lora.py")
    p.add_argument("--seed", type=int, default=config["seed"])
    p.add_argument("--report-to", default="none", help="wandb or none")
    args = p.parse_args()
    if not args.session_id:
        p.error("--session-id (or $DEVIN_OUTPOST_SESSION_ID) is required")
    if not (args.vote_url or args.pairs_json):
        p.error("pass --vote-url or --pairs-json")
    return args


def majority_pairs(rows: list[dict]) -> list[dict]:
    """Collapse per-voter export rows into one winner/loser per pair; tied pairs are dropped."""
    votes: dict[str, Counter] = defaultdict(Counter)
    meta: dict[str, dict] = {}
    for row in rows:
        key = row.get("pairId") or f"{row['prompt']}|{'|'.join(sorted([row['winnerUrl'], row['loserUrl']]))}"
        votes[key][(row["winnerUrl"], row["loserUrl"])] += 1
        meta[key] = row
    pairs = []
    for key, counter in votes.items():
        (best, best_n), *rest = counter.most_common() + [((None, None), 0)]
        if best_n > rest[0][1]:
            pairs.append({"prompt": meta[key]["prompt"], "winnerUrl": best[0], "loserUrl": best[1], "votes": best_n})
    return pairs


def dpo_loss(model_w, model_l, ref_w, ref_l, beta: float):
    """Diffusion-DPO on per-sample flow-matching errors; returns (loss, implicit accuracy)."""
    import torch.nn.functional as F

    inside = -0.5 * beta * ((model_w - model_l) - (ref_w - ref_l))
    return -F.logsigmoid(inside).mean(), (inside > 0).float().mean()


def load_pairs(args) -> list[dict]:
    if args.pairs_json:
        rows = json.loads(Path(args.pairs_json).read_text())
        rows = rows["pairs"] if isinstance(rows, dict) else rows
    else:
        token = os.environ.get("INGEST_TOKEN") or sys.exit("INGEST_TOKEN is required for --vote-url")
        query = urllib.parse.urlencode({"loraVersion": args.lora_version})
        request = urllib.request.Request(
            f"{args.vote_url.rstrip('/')}/api/export?{query}", headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            rows = json.load(response)["pairs"]
    pairs = majority_pairs(rows)
    print(f"🗳️  {len(rows)} decisive votes -> {len(pairs)} pairs with a majority winner")
    if len(pairs) < args.min_pairs:
        sys.exit(f"need at least --min-pairs={args.min_pairs} pairs to post-train")
    return pairs


def load_image(url: str, resolution: int):
    import torchvision.transforms.functional as TF
    from PIL import Image

    with urllib.request.urlopen(url, timeout=60) as response:
        image = Image.open(io.BytesIO(response.read())).convert("RGB")
    scale = max(resolution / image.height, resolution / image.width)
    image = TF.resize(image, [round(image.height * scale), round(image.width * scale)])
    image = TF.center_crop(image, [resolution, resolution])
    return TF.normalize(TF.to_tensor(image), [0.5], [0.5])


def main() -> None:
    args = parse_args()
    pairs = load_pairs(args)

    import torch
    from diffusers import AutoencoderKLFlux2, FlowMatchEulerDiscreteScheduler, Flux2Pipeline, Flux2Transformer2DModel
    from diffusers.utils import convert_unet_state_dict_to_peft
    from peft import LoraConfig, set_peft_model_state_dict
    from peft.utils import get_peft_model_state_dict

    device, dtype = torch.device("cuda"), torch.bfloat16
    model_dir = Path(args.model_dir)
    lora_dir = model_dir / "otterimage" / args.session_id
    out_dir = Path(args.output_dir) if args.output_dir else lora_dir / "dpo"
    out_dir.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(args.seed)
    random.seed(args.seed)

    print("🎨 encoding prompts")
    text_pipe = Flux2Pipeline.from_pretrained(model_dir, transformer=None, vae=None, torch_dtype=dtype).to(device)
    prompt_cache = {}
    with torch.no_grad():
        for prompt in {pair["prompt"] for pair in pairs}:
            embeds, text_ids = text_pipe.encode_prompt(prompt=prompt, max_sequence_length=512)
            prompt_cache[prompt] = (embeds.cpu(), text_ids.cpu())
    del text_pipe
    torch.cuda.empty_cache()

    print("🎨 encoding winner/loser latents")
    vae = AutoencoderKLFlux2.from_pretrained(model_dir, subfolder="vae", torch_dtype=dtype).to(device)
    bn_mean = vae.bn.running_mean.view(1, -1, 1, 1).to(device)
    bn_std = torch.sqrt(vae.bn.running_var.view(1, -1, 1, 1) + vae.config.batch_norm_eps).to(device)
    latents = []
    with torch.no_grad():
        for pair in pairs:
            pixels = torch.stack([load_image(pair["winnerUrl"], args.resolution), load_image(pair["loserUrl"], args.resolution)])
            x0 = Flux2Pipeline._patchify_latents(vae.encode(pixels.to(device, dtype)).latent_dist.mode())
            latents.append(((x0 - bn_mean) / bn_std).cpu())
    del vae
    torch.cuda.empty_cache()

    print(f"🎨 loading transformer + SFT LoRA from {lora_dir}")
    scheduler = FlowMatchEulerDiscreteScheduler.from_pretrained(model_dir, subfolder="scheduler")
    transformer = Flux2Transformer2DModel.from_pretrained(model_dir, subfolder="transformer", torch_dtype=dtype).to(device)
    transformer.requires_grad_(False)
    transformer.enable_gradient_checkpointing()
    transformer.add_adapter(
        LoraConfig(r=args.rank, lora_alpha=args.lora_alpha, init_lora_weights="gaussian", target_modules=TARGET_MODULES)
    )
    state = {k.removeprefix("transformer."): v for k, v in Flux2Pipeline.lora_state_dict(lora_dir).items() if k.startswith("transformer.")}
    incompatible = set_peft_model_state_dict(transformer, convert_unet_state_dict_to_peft(state), adapter_name="default")
    if getattr(incompatible, "unexpected_keys", None):
        sys.exit(f"SFT LoRA doesn't match --rank/target modules: unexpected {incompatible.unexpected_keys[:5]}")
    lora_params = [p for p in transformer.parameters() if p.requires_grad]
    for param in lora_params:
        param.data = param.data.float()

    def flow_errors(index: int, repeat: int):
        """Per-image flow-matching MSE for [winner, loser] with the noise/timestep fixed by (index, repeat)."""
        generator = torch.Generator().manual_seed(args.seed * 1_000_003 + index * 101 + repeat)
        x0 = latents[index].to(device, dtype)
        noise = torch.randn(x0[:1].shape, generator=generator).to(device, dtype).expand_as(x0)
        step = int(torch.randint(0, scheduler.config.num_train_timesteps, (1,), generator=generator))
        sigma = scheduler.sigmas[step].to(device, dtype)
        timestep = scheduler.timesteps[step].to(device).expand(2)
        noisy = (1.0 - sigma) * x0 + sigma * noise
        packed = Flux2Pipeline._pack_latents(noisy)
        img_ids = Flux2Pipeline._prepare_latent_ids(x0).to(device)
        embeds, text_ids = (t.to(device).expand(2, *t.shape[1:]) for t in prompt_cache[pairs[index]["prompt"]])
        with torch.autocast("cuda", dtype=dtype):
            pred = transformer(
                hidden_states=packed,
                timestep=timestep / 1000,
                guidance=torch.full((2,), args.guidance_scale, device=device),
                encoder_hidden_states=embeds.to(dtype),
                txt_ids=text_ids,
                img_ids=img_ids,
                return_dict=False,
            )[0][:, : packed.size(1)]
        pred = Flux2Pipeline._unpack_latents_with_ids(pred, img_ids)
        return ((pred.float() - (noise - x0).float()) ** 2).mean(dim=[1, 2, 3])

    samples = [(i, r) for i in range(len(pairs)) for r in range(args.repeats)]
    print(f"🎨 reference errors for {len(samples)} (pair, draw) samples")
    transformer.eval()
    with torch.no_grad():
        reference = {sample: flow_errors(*sample).cpu() for sample in samples}

    if args.report_to == "wandb":
        import wandb

        wandb.init(project="dreambooth-flux2-dpo", config=vars(args))

    import bitsandbytes as bnb

    optimizer = bnb.optim.AdamW8bit(lora_params, lr=args.learning_rate)
    transformer.train()

    def save(directory: Path) -> None:
        layers = {k: v.detach().to(dtype).cpu().contiguous() for k, v in get_peft_model_state_dict(transformer).items()}
        Flux2Pipeline.save_lora_weights(save_directory=str(directory), transformer_lora_layers=layers)

    step, micro = 0, 0
    while step < args.max_train_steps:
        random.shuffle(samples)
        for sample in samples:
            errors = flow_errors(*sample)
            ref = reference[sample].to(device)
            loss, accuracy = dpo_loss(errors[0:1], errors[1:2], ref[0:1], ref[1:2], args.beta)
            (loss / args.gradient_accumulation_steps).backward()
            micro += 1
            if micro % args.gradient_accumulation_steps:
                continue
            torch.nn.utils.clip_grad_norm_(lora_params, 1.0)
            optimizer.step()
            optimizer.zero_grad()
            step += 1
            print(f"step {step}/{args.max_train_steps} loss {loss.item():.4f} acc {accuracy.item():.2f}")
            if args.report_to == "wandb":
                wandb.log({"loss": loss.item(), "implicit_acc": accuracy.item()}, step=step)
            if step % args.checkpointing_steps == 0:
                save(out_dir / f"checkpoint-{step}")
            if step >= args.max_train_steps:
                break

    save(out_dir)
    subprocess.run(["sync", str(out_dir)], check=True)
    print(f"🎨 DPO finished; LoRA weights in {out_dir}")


if __name__ == "__main__":
    main()
