"""Encode FLUX.2 prompts once and train against the cached embeddings.

    python cached_text_encoder.py encode MODEL_DIR CACHE_DIR PROMPT [PROMPT ...]
    accelerate launch cached_text_encoder.py train CACHE_DIR TRAIN_SCRIPT [trainer args ...]

`encode` loads only the Mistral text encoder (~48 GB in bf16) onto the GPU, so
it fits on one GPU before the transformer is loaded. `train` runs the diffusers
trainer with --remote_text_encoder and answers its remote encoder requests from
the cache, so the trainer never loads the text encoder next to the transformer.

The trainer takes a single --validation_prompt; `train` treats it as one prompt
per line, renders --num_validation_images images for each, and saves them under
<output_dir>/validation/epoch-<N>/ (epoch-<N>-run<K>/ if a resumed run
repeats that epoch). Embeddings are re-encoded when the text encoder or
tokenizer files under MODEL_DIR change.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

REMOTE_ENCODER_URL = "https://remote-text-encoder-flux-2.huggingface.co/predict"


def cache_path(cache_dir: Path, prompt: str) -> Path:
    return cache_dir / f"{hashlib.sha256(prompt.encode()).hexdigest()}.pt"


def encoder_fingerprint(model_dir: Path) -> str:
    files = sorted(f for d in ("text_encoder", "tokenizer") for f in (model_dir / d).rglob("*") if f.is_file())
    return hashlib.sha256(
        json.dumps([(str(f.relative_to(model_dir)), f.stat().st_size, f.stat().st_mtime_ns) for f in files]).encode()
    ).hexdigest()


def encode(model_dir: Path, cache_dir: Path, prompts: list[str]) -> None:
    fingerprint_file = cache_dir / "encoder_fingerprint"
    fingerprint = encoder_fingerprint(model_dir)
    stale = not fingerprint_file.exists() or fingerprint_file.read_text() != fingerprint
    missing = [p for p in dict.fromkeys(prompts) if stale or not cache_path(cache_dir, p).exists()]
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
        path = cache_path(cache_dir, prompt)
        tmp = path.with_suffix(f".{os.getpid()}.tmp")
        torch.save(prompt_embeds.cpu(), tmp)
        os.replace(tmp, path)
        print(f"🎨 cached {tuple(prompt_embeds.shape)} embeddings for {prompt!r}")
    tmp = fingerprint_file.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(fingerprint)
    os.replace(tmp, fingerprint_file)


def load_cached(cache_dir: Path, prompt: str):
    import torch

    path = cache_path(cache_dir, prompt)
    if not path.exists():
        raise FileNotFoundError(f"no cached embeddings for {prompt!r} in {cache_dir}; run `encode` first")
    return torch.load(path)


def train(cache_dir: Path, train_script: Path, trainer_args: list[str]) -> None:
    import requests
    import torch

    post = requests.post

    def cached_post(url, *args, **kwargs):
        if url != REMOTE_ENCODER_URL:
            return post(url, *args, **kwargs)
        prompts = kwargs["json"]["prompt"].split("\n")
        buffer = io.BytesIO()
        torch.save(torch.cat([load_cached(cache_dir, p) for p in prompts]), buffer)
        return SimpleNamespace(status_code=200, content=buffer.getvalue())

    requests.post = cached_post

    spec = importlib.util.spec_from_file_location("train_dreambooth_lora_flux2", train_script)
    trainer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trainer)
    log_validation = trainer.log_validation

    def log_validation_per_prompt(pipeline, args, accelerator, pipeline_args, epoch, torch_dtype, is_final_validation=False):
        joined = args.validation_prompt
        out_dir = Path(args.output_dir) / "validation" / f"epoch-{epoch}"
        run = 1
        while out_dir.exists():
            run += 1
            out_dir = out_dir.with_name(f"epoch-{epoch}-run{run}")
        out_dir.mkdir(parents=True)
        images = []
        try:
            for i, prompt in enumerate(joined.split("\n")):
                args.validation_prompt = prompt
                prompt_images = log_validation(
                    pipeline,
                    args,
                    accelerator,
                    {**pipeline_args, "prompt_embeds": pipeline_args["prompt_embeds"][i : i + 1]},
                    epoch,
                    torch_dtype,
                    is_final_validation,
                )
                for j, image in enumerate(prompt_images):
                    image.save(out_dir / f"prompt-{i}-{j}.png")
                images.extend(prompt_images)
        finally:
            args.validation_prompt = joined
        return images

    trainer.log_validation = log_validation_per_prompt
    sys.argv = [str(train_script), *trainer_args]
    # the trainer reads the module-level `args` its __main__ block sets
    trainer.args = trainer.parse_args()
    trainer.main(trainer.args)


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
