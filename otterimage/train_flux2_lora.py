"""DreamBooth LoRA fine-tune of FLUX.2 [dev] on a handful of images.

Plain Python, no Modal API: run it anywhere with an H100 (FP8 training needs
SM 8.9+), ~65 GB of disk for the base weights, and `HF_TOKEN` in the
environment. On the golden-demos Modal outpost the sandbox already has the
dependencies from otterimage/requirements.txt, the `otterimage-flux2-finetune`
Volume mounted at /model, and the `huggingface-secret` attached, so:

    python otterimage/train_flux2_lora.py --max-train-steps 500

The ~24B-parameter Mistral text encoder is never downloaded or loaded: prompts
are embedded by Hugging Face's hosted remote text encoder
(`--remote_text_encoder` in the diffusers trainer), so only the transformer
and VAE live on the GPU.

Setup: accept the gate at https://huggingface.co/black-forest-labs/FLUX.2-dev
with the account that owns HF_TOKEN.
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

# The FLUX.2-dev repo is ~178 GB. Only the diffusers-format transformer, VAE,
# scheduler and tokenizer are needed (~65 GB); the original BFL checkpoints and
# the text encoder shards are skipped.
DOWNLOAD_PATTERNS = [
    "model_index.json",
    "scheduler/*",
    "vae/*",
    "transformer/*",
    "tokenizer/*",
    "text_encoder/*.json",
]


def parse_args() -> argparse.Namespace:
    here = Path(__file__).parent
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model-dir", default=os.environ.get("MODEL_DIR", "/model"), help="base weights + LoRA output root")
    p.add_argument("--instance-name", default="Devin", help='the "proper noun" being taught to the model')
    p.add_argument("--class-name", default="software engineer", help="class the instance belongs to")
    p.add_argument("--prefix", default="a photo of")
    p.add_argument("--postfix", default="")
    p.add_argument(
        "--instance-example-urls-file",
        default=str(here / "instance_example_urls.txt"),
        help="plaintext file with one image URL or path (relative to the file) per line",
    )
    p.add_argument("--train-script", default=str(here / "train_dreambooth_lora_flux2.py"))
    # Hyperparameters follow diffusers' examples/dreambooth/README_flux2.md
    p.add_argument("--resolution", type=int, default=1024)
    p.add_argument("--train-batch-size", type=int, default=1)
    p.add_argument("--rank", type=int, default=16)
    p.add_argument("--lora-alpha", type=int, default=16)
    p.add_argument("--gradient-accumulation-steps", type=int, default=4)
    p.add_argument("--learning-rate", type=float, default=1e-4)
    p.add_argument("--lr-scheduler", default="constant")
    p.add_argument("--lr-warmup-steps", type=int, default=100)
    p.add_argument("--max-train-steps", type=int, default=500)
    p.add_argument("--checkpointing-steps", type=int, default=1000)
    p.add_argument("--seed", type=int, default=117)
    p.add_argument("--skip-download", action="store_true", help="assume base weights are already in --model-dir")
    return p.parse_args()


def download_models(model_dir: Path) -> None:
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_NAME, local_dir=str(model_dir), allow_patterns=DOWNLOAD_PATTERNS)


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
    """Run a subprocess, echoing its output line by line."""
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
    args = parse_args()
    if not os.environ.get("HF_TOKEN"):
        sys.exit("HF_TOKEN is not set; the remote text encoder and the gated model both need it")

    model_dir = Path(args.model_dir)
    lora_dir = model_dir / "lora"
    model_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_download:
        print("🎨 downloading base weights")
        download_models(model_dir)

    train_script = ensure_train_script(Path(args.train_script))
    urls_file = Path(args.instance_example_urls_file)
    urls = [line.strip() for line in urls_file.read_text().splitlines() if line.strip()]
    img_path = load_images(urls, urls_file.parent, Path(tempfile.mkdtemp(prefix="instance_images_")))

    from accelerate.utils import write_basic_config

    write_basic_config(mixed_precision="bf16")

    instance_phrase = f"{args.instance_name} the {args.class_name}"
    prompt = f"{args.prefix} {instance_phrase} {args.postfix}".strip()

    print("🎨 launching FLUX.2 [dev] dreambooth LoRA training")
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
            "--remote_text_encoder",
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
        ]
    )
    print(f"🎨 training finished; LoRA weights in {lora_dir}")


if __name__ == "__main__":
    main()
