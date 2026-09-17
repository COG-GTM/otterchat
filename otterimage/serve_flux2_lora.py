"""Deploy the FLUX.2 [dev] LoRA trained by otterimage/train_flux2_lora.py as a
Modal model class. No web frontend: call `Model.inference` from other Modal
code or from the CLI.

    modal deploy otterimage/serve_flux2_lora.py
    modal run otterimage/serve_flux2_lora.py --prompt "Qwerty the Golden Retriever as an astronaut"

    # from any Python process with Modal credentials
    Model = modal.Cls.from_name("otterimage-flux2-lora", "Model")
    png_bytes = Model().inference.remote("a photo of Qwerty the Golden Retriever")

Weights come from the `otterimage-flux2-finetune` Volume (the same one the
golden-demos outpost mounts at /model while training). The bf16 transformer
(~64 GB) plus VAE fit on one H100 because the text encoder stays out of the
container: the pipeline is built with `text_encoder=None` and fed embeddings
from Hugging Face's remote encoder.
"""

from pathlib import Path

import modal

app = modal.App(name="otterimage-flux2-lora")

MODEL_DIR = "/model"
LORA_DIR = f"{MODEL_DIR}/lora"
volume = modal.Volume.from_name("otterimage-flux2-finetune", create_if_missing=True)

huggingface_secret = modal.Secret.from_name("huggingface-secret", required_keys=["HF_TOKEN"])

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .uv_pip_install(requirements=[str(Path(__file__).parent / "requirements.txt")])
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)

REMOTE_TEXT_ENCODER_URL = "https://remote-text-encoder-flux-2.huggingface.co/predict"


def remote_text_encode(prompt: str):
    import io
    import os

    import requests
    import torch

    response = requests.post(
        REMOTE_TEXT_ENCODER_URL,
        json={"prompt": prompt},
        headers={
            "Authorization": f"Bearer {os.environ['HF_TOKEN']}",
            "Content-Type": "application/json",
        },
        timeout=120,
    )
    response.raise_for_status()
    return torch.load(io.BytesIO(response.content), weights_only=True)


@app.cls(
    image=image,
    gpu="H100",
    volumes={MODEL_DIR: volume},
    secrets=[huggingface_secret],
    scaledown_window=300,
    timeout=600,
)
class Model:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import Flux2Pipeline

        volume.reload()

        pipe = Flux2Pipeline.from_pretrained(
            MODEL_DIR,
            text_encoder=None,
            tokenizer=None,
            torch_dtype=torch.bfloat16,
        ).to("cuda")
        pipe.load_lora_weights(LORA_DIR)
        self.pipe = pipe

    @modal.method()
    def inference(
        self,
        prompt: str,
        num_inference_steps: int = 28,
        guidance_scale: float = 4.0,
        height: int = 1024,
        width: int = 1024,
        seed: int | None = None,
    ) -> bytes:
        """Generate one image and return it as PNG bytes."""
        import io

        import torch

        prompt_embeds = remote_text_encode(prompt).to("cuda", dtype=torch.bfloat16)
        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None
        image = self.pipe(
            prompt_embeds=prompt_embeds,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            height=height,
            width=width,
            generator=generator,
        ).images[0]
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()


@app.local_entrypoint()
def main(prompt: str = "a photo of Qwerty the Golden Retriever", output: str = "output.png"):
    Path(output).write_bytes(Model().inference.remote(prompt))
    print(f"saved {output}")
