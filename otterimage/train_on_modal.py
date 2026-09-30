"""Run train_flux2_lora.py on a Modal H100.

    modal run --detach otterimage/train_on_modal.py --extra-args "--max-train-steps 800"

`modal run --detach` still cancels the run shortly after the local client
dies. For runs that must outlive the machine that started them, deploy once
and spawn the training call on the deployed app:

    modal deploy otterimage/train_on_modal.py
    python otterimage/train_on_modal.py --extra-args "--skip-download --resume-from-checkpoint latest"
"""

from pathlib import Path

import modal

app = modal.App(name="otterimage-flux2-train")

MODEL_DIR = "/model"
volume = modal.Volume.from_name("otterimage-flux2-finetune", create_if_missing=True)
huggingface_secret = modal.Secret.from_name("huggingface-secret", required_keys=["HF_TOKEN"])
wandb_secret = modal.Secret.from_name("wandb-secret", required_keys=["WANDB_API_KEY"])

here = Path(__file__).parent
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .uv_pip_install(requirements=[str(here / "requirements.txt")])
    .env({"HF_XET_HIGH_PERFORMANCE": "1", "MODEL_DIR": MODEL_DIR})
    .add_local_dir(here, remote_path="/root/otterimage")
)


@app.function(
    image=image,
    gpu="H100",
    cpu=8,
    memory=196608,
    volumes={MODEL_DIR: volume},
    secrets=[huggingface_secret, wandb_secret],
    timeout=4 * 60 * 60,
)
def train(extra_args: str = "") -> None:
    import shlex
    import subprocess
    import sys

    cmd = [sys.executable, "/root/otterimage/train_flux2_lora.py", *shlex.split(extra_args)]
    print("+", " ".join(cmd), flush=True)
    try:
        subprocess.run(cmd, check=True)
    finally:
        volume.commit()


@app.local_entrypoint()
def main(extra_args: str = "") -> None:
    train.remote(extra_args)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Spawn train() on the deployed app and exit.")
    parser.add_argument("--extra-args", default="")
    args = parser.parse_args()
    call = modal.Function.from_name(app.name, "train").spawn(args.extra_args)
    print(f"spawned {call.object_id}; follow with: modal app logs {app.name}")
