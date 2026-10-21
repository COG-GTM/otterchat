"""Launcher for the FLUX.2 [dev] DreamBooth LoRA trainer from diffusers.

What to train is in train_config.yaml; any key there is also a CLI flag.
Prompts are encoded on the fly by the text encoder the trainer loads next to
the transformer; the sandbox runs on a B200 so both fit. Needs ~110 GB disk
under --model-dir, HF_TOKEN (gated model), BLOB_READ_WRITE_TOKEN (the instance
set is the blob-store folder) and WANDB_API_KEY unless --report-to none.

    # Train from scratch with train_config.yaml
    python otterimage/train_flux2_lora.py

    # Resume from the newest checkpoint
    python otterimage/train_flux2_lora.py --skip-download --resume-from-checkpoint latest

    # Another technique from the LyCORIS paper instead of LoRA (see trainer_shim.py)
    python otterimage/train_flux2_lora.py --skip-download --method loha --rank 8 --lora-alpha 8
    python otterimage/train_flux2_lora.py --skip-download --method lokr --lokr-factor 8
    python otterimage/train_flux2_lora.py --skip-download --method native --learning-rate 5e-6
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from adapters import METHODS

MODEL_NAME = "black-forest-labs/FLUX.2-dev"
DIFFUSERS_SHA = "37ce5add81f5b0838b744f03dcc2238ffc740cbc"
TRAIN_SCRIPT_URL = (
    "https://raw.githubusercontent.com/huggingface/diffusers/"
    f"{DIFFUSERS_SHA}/examples/dreambooth/train_dreambooth_lora_flux2.py"
)

BLOB_API = "https://vercel.com/api/blob"

DOWNLOAD_PATTERNS = [
    "model_index.json",
    "scheduler/*",
    "vae/*",
    "transformer/*",
    "tokenizer/*",
    "text_encoder/*",
]


HERE = Path(__file__).parent
DEFAULT_CONFIG = HERE / "train_config.yaml"
TRAINER_SHIM = HERE / "trainer_shim.py"
# Modal caps the endpoint subdomain (<workspace>--otterimage-<id>) at 63 chars
SESSION_ID = r"devin-[a-z0-9]{1,37}"


def load_config(path: Path) -> dict:
    import yaml

    config = yaml.safe_load(path.read_text()) or {}
    if not isinstance(config, dict):
        sys.exit(f"{path}: expected a mapping of option: value")
    return config


def parse_args() -> tuple[argparse.Namespace, dict]:
    pre = argparse.ArgumentParser(add_help=False)
    pre.add_argument("--config", default=str(DEFAULT_CONFIG))
    pre_args, _ = pre.parse_known_args()
    config = load_config(Path(pre_args.config))

    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--config", default=str(DEFAULT_CONFIG), help="YAML with the subject, dataset, hyperparameters and validation settings")
    p.add_argument("--model-dir", default=os.environ.get("MODEL_DIR", "/model"), help="base weights + LoRA output root")
    p.add_argument("--train-script", default=str(HERE / "train_dreambooth_lora_flux2.py"))
    p.add_argument("--skip-download", action="store_true", help="assume base weights are already in --model-dir")
    p.add_argument(
        "--session-id",
        type=session_id,
        default=os.environ.get("DEVIN_OUTPOST_SESSION_ID") or None,
        help="demo session (devin-<id>, default $DEVIN_OUTPOST_SESSION_ID); each trains into its own <model-dir>/otterimage/<session-id>",
    )
    p.add_argument("--output-dir", help="LoRA checkpoints and weights; defaults to <model-dir>/otterimage/<session-id>")
    p.add_argument("--resume-from-checkpoint", help="checkpoint-N under the output dir, or 'latest'; train with the same config")
    p.add_argument("--instance-name")
    p.add_argument("--class-name")
    p.add_argument("--prefix")
    p.add_argument("--postfix")
    p.add_argument("--instance-images-prefix", help="blob-store folder prefix to enumerate as the instance set")
    p.add_argument("--method", choices=METHODS, help="lora, or loha / lokr / native from the LyCORIS paper")
    p.add_argument("--lokr-factor", type=int, help="Kronecker decomposition factor for --method lokr")
    p.add_argument("--resolution", type=int)
    p.add_argument("--train-batch-size", type=int)
    p.add_argument("--rank", type=int)
    p.add_argument("--lora-alpha", type=int)
    p.add_argument("--gradient-accumulation-steps", type=int)
    p.add_argument("--learning-rate", type=float)
    p.add_argument("--lr-scheduler")
    p.add_argument("--lr-warmup-steps", type=int)
    p.add_argument("--max-train-steps", type=int)
    p.add_argument("--checkpointing-steps", type=int)
    p.add_argument("--seed", type=int)
    p.add_argument("--report-to", help="wandb, tensorboard, or none")
    p.add_argument("--validation-prompts", nargs="+", help="one or more; {instance} expands to '<instance-name> the <class-name>'")
    p.add_argument("--validation-epochs", type=int)
    p.add_argument("--num-validation-images", type=int)

    config_keys = {a.dest for a in p._actions if a.dest not in {"help", "config", "model_dir", "train_script", "skip_download", "session_id", "output_dir", "resume_from_checkpoint"}}
    unknown = set(config) - config_keys
    if unknown:
        sys.exit(f"{pre_args.config}: unknown option(s) {sorted(unknown)}; valid: {sorted(config_keys)}")
    missing = config_keys - set(config)
    if missing:
        sys.exit(f"{pre_args.config}: missing option(s) {sorted(missing)}")

    p.set_defaults(**config)
    args = p.parse_args()
    effective = {k: getattr(args, k) for k in sorted(config_keys)}
    return args, effective


def session_id(value: str) -> str:
    if not re.fullmatch(SESSION_ID, value):
        raise argparse.ArgumentTypeError(f"{value!r}: expected devin-<id> with a lowercase alphanumeric id")
    return value


def download_models(model_dir: Path) -> None:
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_NAME, local_dir=str(model_dir), allow_patterns=DOWNLOAD_PATTERNS)


def resume_checkpoint(lora_dir: Path, name: str) -> str | None:
    if name == "latest":
        checkpoints = [
            d for d in lora_dir.glob("checkpoint-*") if d.is_dir() and d.name.removeprefix("checkpoint-").isdigit()
        ]
        return max(checkpoints, key=lambda d: int(d.name.removeprefix("checkpoint-"))).name if checkpoints else None
    checkpoint = Path(name).name
    if not checkpoint.removeprefix("checkpoint-").isdigit() or not (lora_dir / checkpoint).is_dir():
        sys.exit(f"--resume-from-checkpoint: no {lora_dir / checkpoint} directory (pass 'latest' or checkpoint-<step>)")
    return checkpoint


def ensure_train_script(path: Path) -> Path:
    if not path.exists():
        print(f"fetching {TRAIN_SCRIPT_URL}")
        urllib.request.urlretrieve(TRAIN_SCRIPT_URL, path)
    return path


def caption_from_filename(name: str) -> str:
    """The filename is the caption: 'Devin_the_software_engineer_wearing_sunglasses.png'
    becomes 'Devin the software engineer wearing sunglasses'."""
    return Path(name).stem.replace("_", " ")


def list_blob_images(prefix: str) -> list[str]:
    """Every image under the blob-store folder prefix. The store id is embedded in
    BLOB_READ_WRITE_TOKEN ('vercel_blob_rw_<store>_<secret>')."""
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        env_file = HERE.parent / "apps" / "chat" / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("BLOB_READ_WRITE_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"')
    if not token:
        sys.exit("BLOB_READ_WRITE_TOKEN is not set; needed to list the instance-images blob folder")
    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-version": "12",
        "x-vercel-blob-store-id": token.removeprefix("vercel_blob_rw_").split("_")[0],
    }
    urls, cursor = [], None
    while True:
        params = {"prefix": prefix, "limit": "100", **({"cursor": cursor} if cursor else {})}
        request = urllib.request.Request(f"{BLOB_API}?{urllib.parse.urlencode(params)}", headers=headers)
        with urllib.request.urlopen(request) as response:
            page = json.load(response)
        urls.extend(blob["url"] for blob in page["blobs"])
        if not page.get("hasMore"):
            return urls
        cursor = page["cursor"]


def load_images(image_urls: list[str], img_path: Path) -> tuple[Path, list[str]]:
    import PIL.Image
    from smart_open import open

    img_path.mkdir(parents=True, exist_ok=True)
    rows = []
    for url in image_urls:
        name = Path(urllib.parse.urlsplit(url).path).name
        with open(url, "rb") as f:
            PIL.Image.open(f).convert("RGB").save(img_path / name)
        rows.append({"file_name": name, "text": caption_from_filename(name)})
    (img_path / "metadata.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
    print(f"{len(rows)} images loaded")
    return img_path, [row["text"] for row in rows]


def stream(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    assert process.stdout is not None
    with process.stdout as pipe:
        for line in iter(pipe.readline, b""):
            sys.stdout.write(line.decode(errors="replace"))
    exitcode = process.wait()
    if exitcode != 0:
        raise subprocess.CalledProcessError(exitcode, cmd)


def main() -> None:
    args, config = parse_args()
    if not os.environ.get("HF_TOKEN"):
        sys.exit("HF_TOKEN is not set; the gated model needs it")
    if args.report_to == "wandb" and not os.environ.get("WANDB_API_KEY"):
        sys.exit("WANDB_API_KEY is not set; pass --report-to none to train without Weights & Biases")

    model_dir = Path(args.model_dir)
    if not args.output_dir and not args.session_id:
        sys.exit("pass --session-id or set DEVIN_OUTPOST_SESSION_ID; each session trains into <model-dir>/otterimage/<session-id>")
    lora_dir = Path(args.output_dir) if args.output_dir else model_dir / "otterimage" / args.session_id
    resume = resume_checkpoint(lora_dir, args.resume_from_checkpoint) if args.resume_from_checkpoint else None
    if args.resume_from_checkpoint:
        print(f"🎨 resuming from {lora_dir / resume}" if resume else f"🎨 no checkpoint-<step> in {lora_dir}; starting a new run")
    model_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_download:
        print("🎨 downloading base weights")
        download_models(model_dir)

    train_script = ensure_train_script(Path(args.train_script))
    urls = list_blob_images(args.instance_images_prefix)
    img_path, captions = load_images(urls, Path(tempfile.mkdtemp(prefix="instance_images_")))

    from accelerate.utils import write_basic_config

    write_basic_config(mixed_precision="bf16")

    instance_phrase = f"{args.instance_name} the {args.class_name}"
    prompt = f"{args.prefix} {instance_phrase} {args.postfix}".strip()
    validation_prompts = [p.format(instance=instance_phrase) for p in args.validation_prompts]
    if any("\n" in p for p in [prompt, *captions, *validation_prompts]):
        sys.exit("prompts can't contain newlines: the trainer gets validation prompts joined by newlines")

    # native trains full-precision weights, so skip fp8 matmuls and trade compute for activation memory
    precision = ["--gradient_checkpointing"] if args.method == "native" else ["--do_fp8_training"]

    print(f"🎨 launching FLUX.2 [dev] dreambooth {args.method} training with config:")
    for key, value in config.items():
        print(f"    {key}: {value}")
    try:
        stream(
            [
                "accelerate",
                "launch",
                str(TRAINER_SHIM),
                f"--method={args.method}",
                f"--lokr-factor={args.lokr_factor}",
                str(train_script),
                f"--pretrained_model_name_or_path={model_dir}",
                f"--dataset_name={img_path}",
                "--caption_column=text",
                f"--output_dir={lora_dir}",
                f"--instance_prompt={prompt}",
                # the final pass loads a second transformer and runs out of memory
                "--skip_final_inference",
                "--mixed_precision=bf16",
                *precision,
                "--cache_latents",
                "--optimizer=adamW",
                "--guidance_scale=1",
                f"--resolution={args.resolution}",
                f"--train_batch_size={args.train_batch_size}",
                f"--rank={args.rank}",
                f"--lora_alpha={args.lora_alpha}",
                f"--gradient_accumulation_steps={args.gradient_accumulation_steps}",
                f"--learning_rate={args.learning_rate}",
                f"--lr_scheduler={args.lr_scheduler}",
                f"--lr_warmup_steps={args.lr_warmup_steps}",
                f"--max_train_steps={args.max_train_steps}",
                f"--checkpointing_steps={args.checkpointing_steps}",
                f"--seed={args.seed}",
                "--validation_prompt=" + "\n".join(validation_prompts),
                f"--validation_epochs={args.validation_epochs}",
                f"--num_validation_images={args.num_validation_images}",
            ]
            + ([] if args.report_to == "none" else [f"--report_to={args.report_to}"])
            + ([f"--resume_from_checkpoint={resume}"] if resume else [])
        )
    finally:
        # outpost sandboxes commit volume writes on sync, so serving sees the LoRA
        subprocess.run(["sync", str(model_dir)], check=True)
    print(f"🎨 training finished; {args.method} weights in {lora_dir}")


if __name__ == "__main__":
    main()
