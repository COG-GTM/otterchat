"""Launcher for the FLUX.2 [dev] DreamBooth LoRA trainer from diffusers.

What to train is in train_config.yaml; any key there is also a CLI flag.
Needs an H200 (the transformer and text encoder share the GPU while prompts
are encoded), ~110 GB disk under --model-dir, ~100 GB of CPU RAM for the
offloaded text encoder, HF_TOKEN (gated model) and WANDB_API_KEY unless
--report-to none.

    python otterimage/train_flux2_lora.py
    python otterimage/train_flux2_lora.py --config experiments/rank32.yaml --max-train-steps 800
    python otterimage/train_flux2_lora.py --skip-download --resume-from-checkpoint latest
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

MODEL_NAME = "black-forest-labs/FLUX.2-dev"
DIFFUSERS_SHA = "37ce5add81f5b0838b744f03dcc2238ffc740cbc"
TRAIN_SCRIPT_URL = (
    "https://raw.githubusercontent.com/huggingface/diffusers/"
    f"{DIFFUSERS_SHA}/examples/dreambooth/train_dreambooth_lora_flux2.py"
)

# ~110 GB of the 178 GB repo: everything but the BFL checkpoints.
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


def load_config(path: Path) -> dict:
    import yaml

    config = yaml.safe_load(path.read_text()) or {}
    if not isinstance(config, dict):
        sys.exit(f"{path}: expected a mapping of option: value")
    for key in ("instance_example_urls_file",):
        if key in config and "://" not in config[key]:
            config[key] = str((path.parent / config[key]).resolve())
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
    p.add_argument("--resume-from-checkpoint", help="checkpoint-N under <model-dir>/lora, or 'latest'; train with the same config")
    p.add_argument("--instance-name")
    p.add_argument("--class-name")
    p.add_argument("--prefix")
    p.add_argument("--postfix")
    p.add_argument("--instance-example-urls-file", help="one image URL or path (relative to the file) per line")
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
    p.add_argument("--validation-prompt", help="{instance} expands to '<instance-name> the <class-name>'")
    p.add_argument("--validation-epochs", type=int)
    p.add_argument("--num-validation-images", type=int)

    config_keys = {a.dest for a in p._actions if a.dest not in {"help", "config", "model_dir", "train_script", "skip_download", "resume_from_checkpoint"}}
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


def download_models(model_dir: Path) -> None:
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_NAME, local_dir=str(model_dir), allow_patterns=DOWNLOAD_PATTERNS)


def resolve_checkpoint(lora_dir: Path, name: str) -> str:
    if name == "latest":
        checkpoints = sorted(
            (d for d in lora_dir.glob("checkpoint-*") if d.is_dir() and d.name.split("-", 1)[1].isdigit()),
            key=lambda d: int(d.name.split("-", 1)[1]),
        )
        if not checkpoints:
            sys.exit(f"--resume-from-checkpoint latest: no checkpoint-<step> in {lora_dir}")
        return checkpoints[-1].name
    if not (lora_dir / Path(name).name).is_dir():
        sys.exit(f"--resume-from-checkpoint: {lora_dir / Path(name).name} does not exist")
    return Path(name).name


def ensure_train_script(path: Path) -> Path:
    if not path.exists():
        print(f"fetching {TRAIN_SCRIPT_URL}")
        urllib.request.urlretrieve(TRAIN_SCRIPT_URL, path)
    return path


def load_images(image_urls: list[str], base_dir: Path, img_path: Path) -> Path:
    import PIL.Image
    from smart_open import open

    img_path.mkdir(parents=True, exist_ok=True)
    for ii, url in enumerate(image_urls):
        if "://" not in url:
            url = str((base_dir / url).resolve())
        with open(url, "rb") as f:
            PIL.Image.open(f).convert("RGB").save(img_path / f"{ii}.png")
    print(f"{len(image_urls)} images loaded")
    return img_path


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
    lora_dir = model_dir / "lora"
    model_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_download:
        print("🎨 downloading base weights")
        download_models(model_dir)

    resume = resolve_checkpoint(lora_dir, args.resume_from_checkpoint) if args.resume_from_checkpoint else None
    if resume:
        print(f"🎨 resuming from {lora_dir / resume}")

    train_script = ensure_train_script(Path(args.train_script))
    urls_file = Path(args.instance_example_urls_file)
    urls = [line.strip() for line in urls_file.read_text().splitlines() if line.strip()]
    img_path = load_images(urls, urls_file.parent, Path(tempfile.mkdtemp(prefix="instance_images_")))

    from accelerate.utils import write_basic_config

    write_basic_config(mixed_precision="bf16")

    instance_phrase = f"{args.instance_name} the {args.class_name}"
    prompt = f"{args.prefix} {instance_phrase} {args.postfix}".strip()
    validation_prompt = args.validation_prompt.format(instance=instance_phrase)

    print("🎨 launching FLUX.2 [dev] dreambooth LoRA training with config:")
    for key, value in config.items():
        print(f"    {key}: {value}")
    stream(
        [
            "accelerate",
            "launch",
            str(train_script),
            f"--pretrained_model_name_or_path={model_dir}",
            f"--instance_data_dir={img_path}",
            f"--output_dir={lora_dir}",
            f"--instance_prompt={prompt}",
            "--mixed_precision=bf16",
            "--do_fp8_training",
            "--gradient_checkpointing",
            "--offload",
            "--cache_latents",
            "--use_8bit_adam",
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
            f"--validation_prompt={validation_prompt}",
            f"--validation_epochs={args.validation_epochs}",
            f"--num_validation_images={args.num_validation_images}",
        ]
        # accelerate has no "none" tracker; the trainer's tensorboard default is
        # skipped because tensorboard isn't installed
        + ([] if args.report_to == "none" else [f"--report_to={args.report_to}"])
        + ([f"--resume_from_checkpoint={resume}"] if resume else [])
    )
    print(f"🎨 training finished; LoRA weights in {lora_dir}")


if __name__ == "__main__":
    main()
