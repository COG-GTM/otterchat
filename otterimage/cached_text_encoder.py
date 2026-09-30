"""Encode FLUX.2 prompts once and train against the cached embeddings.

    python cached_text_encoder.py encode MODEL_DIR CACHE_DIR PROMPT [PROMPT ...]
    accelerate launch cached_text_encoder.py train CACHE_DIR TRAIN_SCRIPT [trainer args ...]

`encode` loads only the Mistral text encoder (~48 GB in bf16) onto the GPU, so
it fits on an H100 before the transformer is loaded. `train` runs the diffusers
trainer with --remote_text_encoder and answers its remote encoder requests from
the cache, so the trainer never loads the text encoder next to the transformer.
"""

from __future__ import annotations

import argparse
import hashlib
import runpy
import sys
from pathlib import Path
from types import SimpleNamespace

REMOTE_ENCODER_URL = "https://remote-text-encoder-flux-2.huggingface.co/predict"


def cache_path(cache_dir: Path, prompt: str) -> Path:
    return cache_dir / f"{hashlib.sha256(prompt.encode()).hexdigest()}.pt"


def encode(model_dir: Path, cache_dir: Path, prompts: list[str]) -> None:
    missing = [p for p in dict.fromkeys(prompts) if not cache_path(cache_dir, p).exists()]
    if not missing:
        print(f"🎨 all {len(prompts)} prompt embeddings cached in {cache_dir}")
        return

    import torch
    from diffusers import Flux2Pipeline

    pipe = Flux2Pipeline.from_pretrained(
        model_dir, transformer=None, vae=None, scheduler=None, torch_dtype=torch.bfloat16
    ).to("cuda")
    cache_dir.mkdir(parents=True, exist_ok=True)
    for prompt in missing:
        with torch.no_grad():
            prompt_embeds, _ = pipe.encode_prompt(prompt=prompt)
        torch.save(prompt_embeds.cpu(), cache_path(cache_dir, prompt))
        print(f"🎨 cached {tuple(prompt_embeds.shape)} embeddings for {prompt!r}")


def train(cache_dir: Path, train_script: Path, trainer_args: list[str]) -> None:
    import requests

    post = requests.post

    def cached_post(url, *args, **kwargs):
        if url != REMOTE_ENCODER_URL:
            return post(url, *args, **kwargs)
        prompt = kwargs["json"]["prompt"]
        path = cache_path(cache_dir, prompt)
        if not path.exists():
            raise FileNotFoundError(f"no cached embeddings for {prompt!r} in {cache_dir}; run `encode` first")
        return SimpleNamespace(status_code=200, content=path.read_bytes())

    requests.post = cached_post
    sys.argv = [str(train_script), *trainer_args]
    runpy.run_path(str(train_script), run_name="__main__")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    enc = sub.add_parser("encode")
    enc.add_argument("model_dir", type=Path)
    enc.add_argument("cache_dir", type=Path)
    enc.add_argument("prompts", nargs="+")
    tr = sub.add_parser("train")
    tr.add_argument("cache_dir", type=Path)
    tr.add_argument("train_script", type=Path)
    tr.add_argument("trainer_args", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    if args.command == "encode":
        encode(args.model_dir, args.cache_dir, args.prompts)
    else:
        train(args.cache_dir, args.train_script, args.trainer_args)


if __name__ == "__main__":
    main()
