"""Load weights saved by trainer_shim.py --method {lora,loha,lokr,native} into a Flux2Pipeline."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from pathlib import Path

METHODS = ("lora", "loha", "lokr", "native")
WEIGHT_NAME = "pytorch_lora_weights.safetensors"
# LoKr keeps the right Kronecker factor full-size (the paper's "full dimension"); alpha == r keeps the scale at 1
FULL_RANK = 1 << 20
NATIVE_METADATA = {"peft_type": "NATIVE"}
NATIVE_MODULE = re.compile(r"transformer_blocks\.\d+\.attn\.(to_q|to_k|to_v|to_out\.0)")


def is_native_module(name: str) -> bool:
    return NATIVE_MODULE.fullmatch(name) is not None


def load_adapter(pipe, weights_dir: str) -> Callable[[], None]:
    """Apply the weights in weights_dir to pipe.transformer; returns a function that removes them again."""
    import torch
    from peft import LoHaConfig, LoKrConfig, inject_adapter_in_model, set_peft_model_state_dict
    from safetensors.torch import load_file, safe_open

    path = Path(weights_dir) / WEIGHT_NAME
    with safe_open(path, "pt") as f:
        raw = json.loads((f.metadata() or {}).get("lora_adapter_metadata", "{}"))
    metadata = {k.removeprefix("transformer."): v for k, v in raw.items() if k.startswith("transformer.")}
    peft_type = metadata.get("peft_type", "LORA")
    transformer = pipe.transformer

    if peft_type == "LORA":
        pipe.load_lora_weights(weights_dir)
        return pipe.unload_lora_weights

    weights = {k.removeprefix("transformer."): v for k, v in load_file(path).items() if k.startswith("transformer.")}

    if peft_type == "NATIVE":
        params = dict(transformer.named_parameters())
        unknown = sorted(set(weights) - set(params))
        if unknown:
            raise ValueError(f"{weights_dir}: weights for unknown parameters {unknown[:5]}")
        original = {k: params[k].detach().clone() for k in weights}
        with torch.no_grad():
            for k, v in weights.items():
                params[k].copy_(v)

        def restore() -> None:
            with torch.no_grad():
                for k, v in original.items():
                    params[k].copy_(v)

        return restore

    config_cls = {"LOHA": LoHaConfig, "LOKR": LoKrConfig}.get(peft_type)
    if config_cls is None:
        raise ValueError(f"{weights_dir}: unsupported adapter type {peft_type!r}")
    fields = config_cls.__dataclass_fields__
    config = config_cls(**{k: v for k, v in metadata.items() if k in fields and k != "peft_type"})
    inject_adapter_in_model(config, transformer, adapter_name="default")
    result = set_peft_model_state_dict(transformer, weights, adapter_name="default")
    if getattr(result, "unexpected_keys", None):
        raise ValueError(f"{weights_dir}: unexpected adapter keys {result.unexpected_keys[:5]}")
    transformer.to(pipe.dtype)

    def remove() -> None:
        from peft.tuners.tuners_utils import BaseTunerLayer

        for name, module in list(transformer.named_modules()):
            if isinstance(module, BaseTunerLayer):
                parent, _, child = name.rpartition(".")
                setattr(transformer.get_submodule(parent), child, module.get_base_layer())

    return remove
