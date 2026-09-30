"""Modal application for one Devin worker.

Generated once by modal-devin. This is application code and may be edited.
"""

import dataclasses
import logging
import os
import time
from pathlib import Path

import modal

from modal_devin import OutpostsAPIError, Worker, WorkerSettings

logger = logging.getLogger(__name__)

POLL_ATTEMPTS = 3
POLL_RETRY_BASE_DELAY_SECONDS = 1.0
# Slower than modal-devin's 3s default: a poll only has to beat the time it
# takes a sandbox to boot, and every poll is an api.devin.ai round trip that
# can time out.
SCHEDULER_INTERVAL_SECONDS = int(os.environ.get('MODAL_DEVIN_SCHEDULER_INTERVAL_SECONDS', 10))

REPO_ROOT = Path(__file__).resolve().parent.parent

worker = Worker(
    'modal-golden-demos',
    outpost_id='outpost_env-0c622fd54c39430dbc4f8402bec83d73',
    api_url='https://api.devin.ai',
    settings=dataclasses.replace(
        WorkerSettings.from_env(),
        scheduler_interval_seconds=SCHEDULER_INTERVAL_SECONDS,
    ),
)

app = modal.App(
    'modal-devin-modal-golden-demos',
    tags={"service": "modal-devin"},
)
devin_secret = modal.Secret.from_name('devin-outposts-token')
controller_image = worker.controller_image()

# otterimage: FLUX.2 [dev] LoRA fine-tuning (otterimage/train_flux2_lora.py).
# Base weights and trained LoRAs persist on this Volume, mounted in the session
# sandbox at MODEL_DIR; each demo trains into its own MODEL_DIR/otterimage/<demo>,
# so concurrent sessions never share files. The HF token unlocks the gated model.
# Prompts are encoded before the transformer loads, so training fits an H100
# with 192 GB of RAM.
huggingface_secret = modal.Secret.from_name('huggingface-secret', required_keys=['HF_TOKEN'])
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
        memory=196608,
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
    # Only the pending-sessions poll surfaces as OutpostsAPIError; failures while
    # dispatching a session come back as an ExceptionGroup and are never retried
    # here, so a retry cannot double-dispatch.
    for attempt in range(1, POLL_ATTEMPTS + 1):
        try:
            worker.dispatch_pending_sessions(session.spawn)
            return
        except OutpostsAPIError:
            if attempt == POLL_ATTEMPTS:
                raise
            delay = POLL_RETRY_BASE_DELAY_SECONDS * 2 ** (attempt - 1)
            logger.warning(
                "outposts poll attempt %d/%d failed; retrying in %.1fs",
                attempt,
                POLL_ATTEMPTS,
                delay,
            )
            time.sleep(delay)
