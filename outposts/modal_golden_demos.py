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
from modal_devin.images import _DEVIN_BIN

logger = logging.getLogger(__name__)

POLL_ATTEMPTS = 3
POLL_RETRY_BASE_DELAY_SECONDS = 1.0
# a poll only has to beat sandbox boot, and each is an api.devin.ai round trip
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

huggingface_secret = modal.Secret.from_name('huggingface-secret', required_keys=['HF_TOKEN'])
wandb_secret = modal.Secret.from_name('wandb-secret', required_keys=['WANDB_API_KEY'])
MODEL_DIR = '/model'
model_volume = modal.Volume.from_name('otterimage-flux2-finetune', create_if_missing=True)

base_image = (
    worker.base_image()
    # computer use: swap in a CLI wrapper that starts Xvfb + openbox
    .apt_install(
        "dbus-x11",
        "fonts-liberation",
        "fonts-noto-color-emoji",
        "openbox",
        "wmctrl",
        "x11-utils",
        "x11-xserver-utils",
        "xdotool",
        "xvfb",
    )
    .add_local_file(
        REPO_ROOT / 'outposts' / 'devin-display-wrapper.sh',
        f"{_DEVIN_BIN}.wrapper",
        copy=True,
    )
    .run_commands(
        f"mv {_DEVIN_BIN} {_DEVIN_BIN}.real",
        f"mv {_DEVIN_BIN}.wrapper {_DEVIN_BIN}",
        f"chmod 755 {_DEVIN_BIN}",
        # prove the wrapper still delegates to the real CLI
        f"{_DEVIN_BIN} worker start --help | grep -q -- '--session'",
    )
    .uv_pip_install(requirements=[str(REPO_ROOT / 'otterimage' / 'requirements.txt')])
    .run_commands("pip install pillow")
    .env({'HF_XET_HIGH_PERFORMANCE': '1', 'MODEL_DIR': MODEL_DIR})
)

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
        gpu="B200",
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
    # dispatch failures raise ExceptionGroup, not OutpostsAPIError, so a retry can't double-dispatch
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
