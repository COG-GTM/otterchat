"""Modal application for one Devin worker.

Generated once by modal-devin. This is application code and may be edited.
"""

import modal

from modal_devin import Worker

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

base_image = (
    worker.base_image()
    # Add every application-specific build step here.
    # .apt_install("ripgrep")
    # .run_commands("git clone https://github.com/your-org/app /root/workspace/app")
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
        memory=32768,
        gpu="H100",
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
