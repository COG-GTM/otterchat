"""Serve a demo session's LoRA from otterimage/train_flux2_lora.py as a Modal class + POST endpoint.

Each session devin-<id> is its own app, otterimage-<id>, serving <model-dir>/otterimage/devin-<id>
at https://<workspace>--otterimage-<id>.modal.run, so demos never share an endpoint. The session
ID comes from $DEVIN_OUTPOST_SESSION_ID, which outpost sessions set.

    modal deploy otterimage/serve_flux2_lora.py
    modal run otterimage/serve_flux2_lora.py --prompt "Devin the software engineer on the moon"

    Model = modal.Cls.from_name("otterimage-<id>", "Model")
    png_bytes = Model().inference.remote("a photo of Devin the software engineer")

The endpoint needs Modal proxy auth (https://modal.com/settings/proxy-auth-tokens):

    curl -X POST "$URL" -H "Modal-Key: $MODAL_KEY" -H "Modal-Secret: $MODAL_SECRET" \\
      -H "Content-Type: application/json" -d '{"prompt": "a photo of Devin the software engineer", "seed": 1}' -o out.png
"""

import os
import re
import sys
from pathlib import Path

import modal

SESSION_ID = os.environ.get("DEVIN_OUTPOST_SESSION_ID", "")
if not re.fullmatch(r"devin-[a-z0-9]{1,37}", SESSION_ID):
    sys.exit(f"DEVIN_OUTPOST_SESSION_ID={SESSION_ID!r}: set it to the demo session (devin-<id>) whose LoRA to serve")

NAME = f"otterimage-{SESSION_ID.removeprefix('devin-')}"

app = modal.App(name=NAME)

MODEL_DIR = "/model"
LORA_DIR = f"{MODEL_DIR}/otterimage/{SESSION_ID}"
volume = modal.Volume.from_name("otterimage-flux2-finetune", create_if_missing=True)

huggingface_secret = modal.Secret.from_name("huggingface-secret", required_keys=["HF_TOKEN"])

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .uv_pip_install(requirements=[str(Path(__file__).parent / "requirements.txt")])
    .uv_pip_install("fastapi[standard]==0.116.1")
    .env({"HF_XET_HIGH_PERFORMANCE": "1", "DEVIN_OUTPOST_SESSION_ID": SESSION_ID})
)

@app.cls(
    image=image,
    gpu="H200",
    volumes={MODEL_DIR: volume},
    secrets=[huggingface_secret],
    scaledown_window=60 * 60,
    timeout=600,
)
class Model:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import Flux2Pipeline

        volume.reload()

        pipe = Flux2Pipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16).to("cuda")
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

        generator = torch.Generator("cuda").manual_seed(seed) if seed is not None else None
        image = self.pipe(
            prompt=prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            height=height,
            width=width,
            generator=generator,
        ).images[0]
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True, label=NAME)
    def generate(self, body: dict):
        """POST {"prompt": str, "num_inference_steps"?, "guidance_scale"?, "height"?, "width"?, "seed"?} -> image/png"""
        from fastapi import HTTPException
        from fastapi.responses import Response

        prompt = body.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise HTTPException(status_code=422, detail="'prompt' (non-empty string) is required")
        if len(prompt) > 1000:
            raise HTTPException(status_code=422, detail="'prompt' too long (max 1000 chars)")

        steps = int(body.get("num_inference_steps", 28))
        height = int(body.get("height", 1024))
        width = int(body.get("width", 1024))
        if not 1 <= steps <= 50 or not 256 <= height <= 1536 or not 256 <= width <= 1536:
            raise HTTPException(status_code=422, detail="steps must be 1-50, height/width 256-1536")

        png = self.inference.local(
            prompt,
            num_inference_steps=steps,
            guidance_scale=float(body.get("guidance_scale", 4.0)),
            height=height,
            width=width,
            seed=body.get("seed"),
        )
        return Response(content=png, media_type="image/png")


@app.local_entrypoint()
def main(prompt: str = "a photo of Devin the software engineer", output: str = "output.png"):
    Path(output).write_bytes(Model().inference.remote(prompt))
    print(f"saved {output}")
