"""Modal application for one Devin worker.

Generated once by modal-devin. This is application code and may be edited.
"""

from pathlib import Path

import modal

from modal_devin import Worker

REPO_ROOT = Path(__file__).resolve().parent.parent

worker = Worker.from_env(
    'modal-golden-demos',
    outpost_id='outpost_env-0c622fd54c39430dbc4f8402bec83d73',
    api_url='https://api.devin.ai',
)

app = modal.App(
    'modal-devin-modal-golden-demos',
    tags={"service": "modal-devin"},
)
devin_secret = modal.Secret.from_name('devin-outposts-token')
controller_image = worker.controller_image()

# otterimage: FLUX.2 [dev] LoRA fine-tuning (otterimage/train_flux2_lora.py).
# Base weights and trained LoRAs persist on this Volume, mounted in the session
# sandbox at MODEL_DIR; the HF token unlocks the gated model and the remote
# text encoder.
huggingface_secret = modal.Secret.from_name('huggingface-secret', required_keys=['HF_TOKEN'])
# Training metrics + validation samples are reported to Weights & Biases.
wandb_secret = modal.Secret.from_name('wandb-secret', required_keys=['WANDB_API_KEY'])
MODEL_DIR = '/model'
model_volume = modal.Volume.from_name('otterimage-flux2-finetune', create_if_missing=True)

base_image = (
    worker.base_image()
    # Add every application-specific build step here.
    .uv_pip_install(requirements=[str(REPO_ROOT / 'otterimage' / 'requirements.txt')])
    .env({'HF_XET_HIGH_PERFORMANCE': '1', 'MODEL_DIR': MODEL_DIR})
)

# Adds the modal-devin runtime after all user image customization.
image = worker.prepare_image(base_image)


@app.function(
    name="session",
    image=image,
    secrets=[devin_secret],
    timeout=worker.session_function_timeout_seconds,
)
def session(session_id: str) -> None:
    worker.run_session(
        session_id,
        app=app,
        image=image,
        cpu=8,
        memory=65536,
        gpu="H100",
        secrets=[huggingface_secret, wandb_secret],
        volumes={MODEL_DIR: model_volume},
    )


@app.function(
    name="scheduler",
    image=controller_image,
    secrets=[devin_secret],
    schedule=modal.Period(seconds=worker.settings.scheduler_interval_seconds),
    max_containers=1,
)
def scheduler() -> None:
    worker.dispatch_pending_sessions(session.spawn)
