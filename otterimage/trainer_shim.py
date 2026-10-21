"""Run the FLUX.2 DreamBooth trainer with per-line prompts.

    accelerate launch trainer_shim.py [--method M] [--lokr-factor N] TRAIN_SCRIPT [trainer args ...]

The trainer takes a single --validation_prompt; this shim treats it as one
prompt per line, renders --num_validation_images images for each, and saves
them under <output_dir>/validation/epoch-<N>/ (epoch-<N>-run<K>/ if a resumed
run repeats that epoch). Newline-joined prompts are encoded line-by-line so
per-prompt embeddings batch the same way they did through the remote encoder.

--method swaps LoRA for loha, lokr or native (LyCORIS paper, arXiv 2309.14859); load results with adapters.load_adapter.
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

from adapters import FULL_RANK, METHODS, NATIVE_METADATA, is_native_module


def use_method(trainer, method: str, lokr_factor: int) -> None:
    import torch
    from peft import LoHaConfig, LoKrConfig

    if method == "loha":
        trainer.LoraConfig = lambda r, lora_alpha, lora_dropout, target_modules, **_: LoHaConfig(
            r=r, alpha=lora_alpha, rank_dropout=lora_dropout, target_modules=target_modules
        )
    elif method == "lokr":
        trainer.LoraConfig = lambda lora_dropout, target_modules, **_: LoKrConfig(
            r=FULL_RANK,
            alpha=FULL_RANK,
            decompose_factor=lokr_factor,
            rank_dropout=lora_dropout,
            target_modules=target_modules,
        )
    elif method == "native":

        def train_attention(model, _config):
            for name, module in model.named_modules():
                if is_native_module(name):
                    module.weight.data = module.weight.data.float()
                    module.weight.requires_grad_(True)

        def trainable_state_dict(model, **_):
            return {n: p.detach().to(torch.bfloat16) for n, p in model.named_parameters() if p.requires_grad}

        def load_trainable(model, state_dict, **_):
            return model.load_state_dict(state_dict, strict=False)

        trainer.Flux2Transformer2DModel.add_adapter = train_attention
        trainer.get_peft_model_state_dict = trainable_state_dict
        trainer.set_peft_model_state_dict = load_trainable
        trainer._collate_lora_metadata = lambda _modules: {"transformer_lora_adapter_metadata": NATIVE_METADATA}


def train(train_script: Path, trainer_args: list[str], method: str = "lora", lokr_factor: int = 8) -> None:
    import torch
    from diffusers import Flux2Pipeline

    spec = importlib.util.spec_from_file_location("train_dreambooth_lora_flux2", train_script)
    trainer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trainer)
    use_method(trainer, method, lokr_factor)

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
    p = argparse.ArgumentParser()
    p.add_argument("--method", choices=METHODS, default="lora")
    p.add_argument("--lokr-factor", type=int, default=8)
    p.add_argument("train_script", type=Path)
    p.add_argument("trainer_args", nargs=argparse.REMAINDER)
    args = p.parse_args()
    train(args.train_script, args.trainer_args, args.method, args.lokr_factor)


if __name__ == "__main__":
    main()
