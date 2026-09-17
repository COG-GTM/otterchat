# ---
# deploy: true
# ---

# # Fine-tune FLUX.2 [dev] on your pet using LoRA
#
# Port of Modal's `diffusers_lora_finetune.py` example from FLUX.1-dev to
# [FLUX.2 [dev]](https://huggingface.co/black-forest-labs/FLUX.2-dev).
#
# Differences from the FLUX.1 version:
#
# - trains with diffusers' `train_dreambooth_lora_flux2.py` (FP8 via torchao,
#   gradient checkpointing, cached latents, 8-bit Adam)
# - never loads the ~24B-parameter Mistral Small 3.1 text encoder: prompts are
#   embedded by Hugging Face's hosted remote text encoder, both during training
#   (`--remote_text_encoder`) and at inference time, so only the transformer and
#   VAE live on the GPU
# - runs on H100s: FP8 training needs compute capability >= 8.9, and the bf16
#   transformer alone is ~64 GB
#
# Setup:
#
# 1. Accept the gate at https://huggingface.co/black-forest-labs/FLUX.2-dev
# 2. Create a Modal Secret named `huggingface-secret` with key `HF_TOKEN`
#
# Usage:
#
#     modal run otterimage/flux2_lora_finetune.py          # download + train
#     modal serve otterimage/flux2_lora_finetune.py        # iterate on the UI
#     modal deploy otterimage/flux2_lora_finetune.py       # publish the UI

from dataclasses import dataclass
from pathlib import Path

import modal

app = modal.App(name="otterimage-flux2-lora-finetune")

# ## Container image
#
# FLUX.2 support only exists on diffusers `main`, so the library and the
# training script are both pinned to the same commit.

DIFFUSERS_SHA = "37ce5add81f5b0838b744f03dcc2238ffc740cbc"
TRAIN_SCRIPT_URL = (
    "https://raw.githubusercontent.com/huggingface/diffusers/"
    f"{DIFFUSERS_SHA}/examples/dreambooth/train_dreambooth_lora_flux2.py"
)
TRAIN_SCRIPT = "/root/train_dreambooth_lora_flux2.py"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .uv_pip_install(
        "torch==2.8.0",
        "torchvision==0.23.0",
        "torchao==0.13.0",
        "bitsandbytes==0.48.1",
        "accelerate==1.10.1",
        "transformers==4.57.1",
        "peft==0.17.1",
        "sentencepiece==0.2.1",
        "ftfy==6.3.1",
        "huggingface-hub[hf_xet]==0.36.0",
        "smart_open==7.7.1",
        "requests==2.32.5",
        "gradio==5.49.1",
        "fastapi[standard]==0.116.2",
        "pydantic==2.11.9",
        f"git+https://github.com/huggingface/diffusers.git@{DIFFUSERS_SHA}",
    )
    .run_commands(f"curl -fsSL {TRAIN_SCRIPT_URL} -o {TRAIN_SCRIPT}")
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)

# ## Configuration


@dataclass
class SharedConfig:
    """Configuration information shared across project components."""

    # The instance name is the "proper noun" we're teaching the model
    instance_name: str = "Qwerty"
    # That proper noun is usually a member of some class (person, bird),
    # and sharing that information with the model helps it generalize better.
    class_name: str = "Golden Retriever"
    # identifier for pretrained models on Hugging Face
    model_name: str = "black-forest-labs/FLUX.2-dev"


# ## Storage
#
# One Volume holds the base weights and the trained LoRA. The FLUX.2-dev repo
# is ~178 GB; we only fetch the diffusers-format transformer, VAE, scheduler and
# tokenizer (~65 GB) and skip the text encoder and the original BFL checkpoints.

volume = modal.Volume.from_name("otterimage-flux2-finetune", create_if_missing=True)
MODEL_DIR = "/model"
LORA_DIR = f"{MODEL_DIR}/lora"

DOWNLOAD_PATTERNS = [
    "model_index.json",
    "scheduler/*",
    "vae/*",
    "transformer/*",
    "tokenizer/*",
    "text_encoder/*.json",
]

huggingface_secret = modal.Secret.from_name(
    "huggingface-secret", required_keys=["HF_TOKEN"]
)


@app.function(
    volumes={MODEL_DIR: volume},
    image=image,
    secrets=[huggingface_secret],
    timeout=3600,
    cpu=8,
    memory=32768,
)
def download_models(config):
    from huggingface_hub import snapshot_download

    snapshot_download(
        config.model_name,
        local_dir=MODEL_DIR,
        allow_patterns=DOWNLOAD_PATTERNS,
    )
    volume.commit()


# ## Remote text encoder
#
# Hugging Face hosts the FLUX.2 [dev] text encoder behind an authenticated
# endpoint that returns bf16 prompt embeddings. Using it keeps ~48 GB of
# weights off our GPU.

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
    return torch.load(io.BytesIO(response.content))


# ## Load fine-tuning dataset


def load_images(image_urls: list[str]) -> Path:
    import PIL.Image
    from smart_open import open

    img_path = Path("/img")

    img_path.mkdir(parents=True, exist_ok=True)
    for ii, url in enumerate(image_urls):
        with open(url, "rb") as f:
            image = PIL.Image.open(f)
            image.convert("RGB").save(img_path / f"{ii}.png")
    print(f"{ii + 1} images loaded")

    return img_path


# ## Training
#
# Hyperparameters follow the FLUX.2 [dev] recipe in diffusers'
# examples/dreambooth/README_flux2.md.

USE_WANDB = False


@dataclass
class TrainConfig(SharedConfig):
    """Configuration for the finetuning step."""

    # training prompt looks like `{PREFIX} {INSTANCE_NAME} the {CLASS_NAME} {POSTFIX}`
    prefix: str = "a photo of"
    postfix: str = ""

    # locator for plaintext file with urls for images of target instance
    instance_example_urls_file: str = str(
        Path(__file__).parent / "instance_example_urls.txt"
    )

    resolution: int = 1024
    train_batch_size: int = 1
    rank: int = 16  # lora rank
    lora_alpha: int = 16
    gradient_accumulation_steps: int = 4
    learning_rate: float = 1e-4
    lr_scheduler: str = "constant"
    lr_warmup_steps: int = 100
    max_train_steps: int = 500
    checkpointing_steps: int = 1000
    seed: int = 117


@app.function(
    image=image,
    gpu="H100",
    volumes={MODEL_DIR: volume},
    timeout=3 * 3600,
    memory=65536,
    secrets=[huggingface_secret]
    + (
        [modal.Secret.from_name("wandb-secret", required_keys=["WANDB_API_KEY"])]
        if USE_WANDB
        else []
    ),
)
def train(instance_example_urls, config):
    import subprocess

    from accelerate.utils import write_basic_config

    volume.reload()

    img_path = load_images(instance_example_urls)

    write_basic_config(mixed_precision="bf16")

    instance_phrase = f"{config.instance_name} the {config.class_name}"
    prompt = f"{config.prefix} {instance_phrase} {config.postfix}".strip()

    def _exec_subprocess(cmd: list[str]):
        """Executes subprocess and prints log to terminal while subprocess is running."""
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        with process.stdout as pipe:
            for line in iter(pipe.readline, b""):
                print(line.decode(), end="")

        exitcode = process.wait()
        if exitcode != 0:
            raise subprocess.CalledProcessError(exitcode, " ".join(cmd))

    print("launching FLUX.2 [dev] dreambooth LoRA training")
    _exec_subprocess(
        [
            "accelerate",
            "launch",
            TRAIN_SCRIPT,
            f"--pretrained_model_name_or_path={MODEL_DIR}",
            f"--instance_data_dir={img_path}",
            f"--output_dir={LORA_DIR}",
            f"--instance_prompt={prompt}",
            "--mixed_precision=bf16",
            "--do_fp8_training",
            "--gradient_checkpointing",
            "--remote_text_encoder",
            "--cache_latents",
            "--use_8bit_adam",
            "--optimizer=adamW",
            "--guidance_scale=1",
            f"--resolution={config.resolution}",
            f"--train_batch_size={config.train_batch_size}",
            f"--rank={config.rank}",
            f"--lora_alpha={config.lora_alpha}",
            f"--gradient_accumulation_steps={config.gradient_accumulation_steps}",
            f"--learning_rate={config.learning_rate}",
            f"--lr_scheduler={config.lr_scheduler}",
            f"--lr_warmup_steps={config.lr_warmup_steps}",
            f"--max_train_steps={config.max_train_steps}",
            f"--checkpointing_steps={config.checkpointing_steps}",
            f"--seed={config.seed}",
        ]
        + (["--report_to=wandb"] if USE_WANDB else [])
    )
    volume.commit()


# ## Inference
#
# The bf16 transformer (~64 GB) plus VAE fit on one H100 as long as the text
# encoder stays out of the container, so the pipeline is built with
# `text_encoder=None` and fed embeddings from the remote encoder.


@dataclass
class AppConfig(SharedConfig):
    """Configuration information for inference."""

    num_inference_steps: int = 28
    guidance_scale: float = 4.0
    height: int = 1024
    width: int = 1024


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
    def inference(self, text, config):
        import torch

        prompt_embeds = remote_text_encode(text).to("cuda", dtype=torch.bfloat16)
        image = self.pipe(
            prompt_embeds=prompt_embeds,
            num_inference_steps=config.num_inference_steps,
            guidance_scale=config.guidance_scale,
            height=config.height,
            width=config.width,
        ).images[0]

        return image


# ## Gradio web UI


@app.function(image=image, max_containers=1)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def fastapi_app():
    import gradio as gr
    from fastapi import FastAPI
    from gradio.routes import mount_gradio_app

    web_app = FastAPI()

    config = AppConfig()
    instance_phrase = f"{config.instance_name} the {config.class_name}"

    example_prompts = [
        f"{instance_phrase}",
        f"a painting of {instance_phrase.title()} With A Pearl Earring, by Vermeer",
        f"oil painting of {instance_phrase} flying through space as an astronaut",
        f"a painting of {instance_phrase} in cyberpunk city. character design by cory loftis. volumetric light, detailed, rendered in octane",
        f"drawing of {instance_phrase} high quality, cartoon, path traced, by studio ghibli and don bluth",
    ]

    def go(text=""):
        if not text:
            text = example_prompts[0]
        return Model().inference.remote(text, config)

    description = """Describe what they are doing or how a particular artist or style would depict them. Be fantastical! Try the examples below for inspiration.

Generated by a FLUX.2 [dev] LoRA trained on Modal."""

    theme = gr.themes.Default(
        primary_hue="green", secondary_hue="emerald", neutral_hue="neutral"
    )

    with gr.Blocks(
        theme=theme,
        title=f"Generate images of {config.instance_name} on Modal",
    ) as interface:
        gr.Markdown(f"# Generate images of {instance_phrase}.\n\n{description}")
        with gr.Row():
            inp = gr.Textbox(
                label="",
                placeholder=f"Describe the version of {instance_phrase} you'd like to see",
                lines=10,
            )
            out = gr.Image(
                height=512, width=512, label="", min_width=512, elem_id="output"
            )
        with gr.Row():
            btn = gr.Button("Dream", variant="primary", scale=2)
            btn.click(fn=go, inputs=inp, outputs=out)

            gr.Button(
                "⚡️ Powered by Modal",
                variant="secondary",
                link="https://modal.com",
            )

        with gr.Column(variant="compact"):
            for ii, prompt in enumerate(example_prompts):
                btn = gr.Button(prompt, variant="secondary")
                btn.click(fn=lambda idx=ii: example_prompts[idx], outputs=inp)

    return mount_gradio_app(app=web_app, blocks=interface, path="/")


# ## Local entrypoint
#
# `modal run otterimage/flux2_lora_finetune.py` downloads the base weights (once)
# and trains the LoRA.


@app.local_entrypoint()
def run(
    max_train_steps: int = 500,
):
    print("🎨 loading model")
    download_models.remote(SharedConfig())
    print("🎨 setting up training")
    config = TrainConfig(max_train_steps=max_train_steps)
    instance_example_urls = (
        Path(TrainConfig.instance_example_urls_file).read_text().splitlines()
    )
    train.remote(instance_example_urls, config)
    print("🎨 training finished")
