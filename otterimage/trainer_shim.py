"""Run the FLUX.2 DreamBooth trainer with per-line prompts.

    accelerate launch trainer_shim.py TRAIN_SCRIPT [trainer args ...]

The trainer takes a single --validation_prompt; this shim treats it as one
prompt per line, renders --num_validation_images images for each, and saves
them under <output_dir>/validation/epoch-<N>/ (epoch-<N>-run<K>/ if a resumed
run repeats that epoch). Newline-joined prompts are encoded line-by-line so
per-prompt embeddings batch the same way they did through the remote encoder.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def train(train_script: Path, trainer_args: list[str]) -> None:
    import torch
    from diffusers import Flux2Pipeline

    spec = importlib.util.spec_from_file_location("train_dreambooth_lora_flux2", train_script)
    trainer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trainer)

    encode_prompt = Flux2Pipeline.encode_prompt

    def encode_prompt_per_line(self, prompt, *args, **kwargs):
        if isinstance(prompt, str) and "\n" in prompt:
            embeds, text_ids = zip(*(encode_prompt(self, prompt=p, *args, **kwargs) for p in prompt.split("\n")))
            return torch.cat(list(embeds)), torch.cat(list(text_ids))
        return encode_prompt(self, prompt=prompt, *args, **kwargs)

    Flux2Pipeline.encode_prompt = encode_prompt_per_line

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
    train(Path(sys.argv[1]), sys.argv[2:])


if __name__ == "__main__":
    main()
