import datetime
import logging
import threading
import time
import traceback
import torch
import asyncio
from contextlib import nullcontext

from modules import errors, shared, devices
from backend.args import args
from typing import Optional

log = logging.getLogger(__name__)


class State:
    skipped = False
    interrupted = False
    stopping_generation = False
    job = ""
    job_no = 0
    job_count = 0
    processing_has_refined_job_count = False
    job_timestamp = '0'
    sampling_step = 0
    sampling_steps = 0
    current_latent = None
    current_image = None
    current_image_sampling_step = 0
    id_live_preview = 0
    textinfo = None
    time_start = None
    server_start = None
    _server_command_signal = threading.Event()
    _server_command: Optional[str] = None

    def __init__(self):
        self.server_start = time.time()
        if args.cuda_stream:
            self.vae_stream = torch.cuda.Stream()
        else:
            self.vae_stream = None

    @property
    def need_restart(self) -> bool:
        # Compatibility getter for need_restart.
        return self.server_command == "restart"

    @need_restart.setter
    def need_restart(self, value: bool) -> None:
        # Compatibility setter for need_restart.
        if value:
            self.server_command = "restart"

    @property
    def server_command(self):
        return self._server_command

    @server_command.setter
    def server_command(self, value: Optional[str]) -> None:
        """
        Set the server command to `value` and signal that it's been set.
        """
        self._server_command = value
        self._server_command_signal.set()

    def wait_for_server_command(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Wait for server command to get set; return and clear the value and signal.
        """
        if self._server_command_signal.wait(timeout):
            self._server_command_signal.clear()
            req = self._server_command
            self._server_command = None
            return req
        return None

    def request_restart(self) -> None:
        self.interrupt()
        self.server_command = "restart"
        log.info("Received restart request")

    def skip(self):
        self.skipped = True
        log.info("Received skip request")

    def interrupt(self):
        self.interrupted = True
        log.info("Received interrupt request")

    def stop_generating(self):
        self.stopping_generation = True
        log.info("Received stop generating request")

    def nextjob(self):
        if shared.opts.live_previews_enable and shared.opts.show_progress_every_n_steps == -1:
            self.do_set_current_image()

        self.job_no += 1
        self.sampling_step = 0
        self.current_image_sampling_step = 0

    def dict(self):
        obj = {
            "skipped": self.skipped,
            "interrupted": self.interrupted,
            "stopping_generation": self.stopping_generation,
            "job": self.job,
            "job_count": self.job_count,
            "job_timestamp": self.job_timestamp,
            "job_no": self.job_no,
            "sampling_step": self.sampling_step,
            "sampling_steps": self.sampling_steps,
        }

        return obj

    def begin(self, job: str = "(unknown)"):
        self.sampling_step = 0
        self.time_start = time.time()
        self.job_count = -1
        self.processing_has_refined_job_count = False
        self.job_no = 0
        self.job_timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        self.current_latent = None
        self.current_image = None
        self.current_image_sampling_step = 0
        self.id_live_preview = 0
        self.skipped = False
        self.interrupted = False
        self.stopping_generation = False
        self.textinfo = None
        self.job = job
        devices.torch_gc()
        log.info("Starting job %s", job)

    def end(self):
        duration = time.time() - self.time_start
        log.info("Ending job %s (%.2f seconds)", self.job, duration)
        self.job = ""
        self.job_count = 0

        devices.torch_gc()

    @torch.inference_mode()
    def set_current_image(self):
        """if enough sampling steps have been made after the last call to this, sets self.current_image from self.current_latent, and modifies self.id_live_preview accordingly"""
        if not shared.parallel_processing_allowed:
            return

        # Check if we should generate live preview or just broadcast progress
        should_generate_preview = (self.sampling_step - self.current_image_sampling_step >= shared.opts.show_progress_every_n_steps
                                  and shared.opts.live_previews_enable and shared.opts.show_progress_every_n_steps != -1)

        # Always broadcast progress at regular intervals (every 5 steps minimum)
        progress_interval = max(5, shared.opts.show_progress_every_n_steps) if shared.opts.show_progress_every_n_steps > 0 else 5
        should_broadcast_progress = (self.sampling_step % progress_interval == 0)

        if should_generate_preview:
            self.do_set_current_image()
        elif should_broadcast_progress:
            # Broadcast progress update without generating new image
            self._broadcast_progress_update()

    @torch.inference_mode()
    def do_set_current_image(self):
        if self.current_latent is None:
            return

        import modules.sd_samplers

        try:
            if self.vae_stream is not None:
                # not waiting on default stream will result in corrupt results
                # will not block main stream under any circumstances
                self.vae_stream.wait_stream(torch.cuda.default_stream())
                vae_context = torch.cuda.stream(self.vae_stream)
            else:
                vae_context = nullcontext()
            with vae_context:
                if shared.opts.show_progress_grid:
                    self.assign_current_image(modules.sd_samplers.samples_to_image_grid(self.current_latent))
                else:
                    self.assign_current_image(modules.sd_samplers.sample_to_image(self.current_latent))

            self.current_image_sampling_step = self.sampling_step

        except Exception as e:
            # traceback.print_exc()
            # print(e)
            # when switching models during genration, VAE would be on CPU, so creating an image will fail.
            # we silently ignore this error
            errors.record_exception()

    @torch.inference_mode()
    def assign_current_image(self, image):
        if shared.opts.live_previews_image_format == 'jpeg' and image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        self.current_image = image
        self.id_live_preview += 1

        # Broadcast progress update with new preview image via WebSocket
        self._broadcast_progress_update()

    async def _broadcast_progress_update_async(self):
        """Async version of broadcast progress update for use in asyncio contexts"""
        try:
            # Import here to avoid circular imports
            from modules.progress import websocket_manager, current_task
            import io
            import base64

            # Only broadcast if we have an active task
            if current_task:
                live_preview = None
                id_live_preview = self.id_live_preview

                # Include live preview if available and enabled
                if shared.opts.live_previews_enable and self.current_image is not None:
                    # Encode the current image as base64
                    buffered = io.BytesIO()

                    if shared.opts.live_previews_image_format == "png":
                        if max(*self.current_image.size) <= 256:
                            save_kwargs = {"optimize": True}
                        else:
                            save_kwargs = {"optimize": False, "compress_level": 1}
                    else:
                        save_kwargs = {}

                    self.current_image.save(buffered, format=shared.opts.live_previews_image_format, **save_kwargs)
                    base64_image = base64.b64encode(buffered.getvalue()).decode('ascii')
                    live_preview = f"data:image/{shared.opts.live_previews_image_format};base64,{base64_image}"

                # Calculate progress
                progress = 0
                job_count, job_no = self.job_count, self.job_no
                sampling_steps, sampling_step = self.sampling_steps, self.sampling_step

                if job_count > 0:
                    progress += job_no / job_count
                if sampling_steps > 0 and job_count > 0:
                    progress += 1 / job_count * sampling_step / sampling_steps
                progress = min(progress, 1)

                # Calculate ETA
                elapsed_since_start = time.time() - self.time_start
                predicted_duration = elapsed_since_start / progress if progress > 0 else None
                eta = predicted_duration - elapsed_since_start if predicted_duration is not None else None

                progress_data = {
                    "active": True,
                    "queued": False,
                    "completed": False,
                    "progress": progress,
                    "eta": eta,
                    "live_preview": live_preview,
                    "id_live_preview": id_live_preview,
                    "textinfo": self.textinfo,
                    "sampling_step": self.sampling_step,
                    "sampling_steps": self.sampling_steps,
                    "job_no": self.job_no,
                    "job_count": self.job_count
                }

                # Broadcast directly (already in async context)
                await websocket_manager.broadcast_task_progress(current_task, progress_data)

        except Exception as e:
            # Don't let WebSocket broadcasting errors interrupt generation
            print(f"WebSocket progress broadcast error: {e}")

    def _broadcast_progress_update(self):
        """Broadcast current progress state via WebSocket"""
        try:
            # Import here to avoid circular imports
            from modules.progress import websocket_manager, current_task
            import io
            import base64

            # Only broadcast if we have an active task
            if current_task:
                live_preview = None
                id_live_preview = self.id_live_preview

                # Include live preview if available and enabled
                if shared.opts.live_previews_enable and self.current_image is not None:
                    # Encode the current image as base64
                    buffered = io.BytesIO()

                    if shared.opts.live_previews_image_format == "png":
                        if max(*self.current_image.size) <= 256:
                            save_kwargs = {"optimize": True}
                        else:
                            save_kwargs = {"optimize": False, "compress_level": 1}
                    else:
                        save_kwargs = {}

                    self.current_image.save(buffered, format=shared.opts.live_previews_image_format, **save_kwargs)
                    base64_image = base64.b64encode(buffered.getvalue()).decode('ascii')
                    live_preview = f"data:image/{shared.opts.live_previews_image_format};base64,{base64_image}"

                # Calculate progress
                progress = 0
                job_count, job_no = self.job_count, self.job_no
                sampling_steps, sampling_step = self.sampling_steps, self.sampling_step

                if job_count > 0:
                    progress += job_no / job_count
                if sampling_steps > 0 and job_count > 0:
                    progress += 1 / job_count * sampling_step / sampling_steps
                progress = min(progress, 1)

                # Calculate ETA
                elapsed_since_start = time.time() - self.time_start
                predicted_duration = elapsed_since_start / progress if progress > 0 else None
                eta = predicted_duration - elapsed_since_start if predicted_duration is not None else None

                progress_data = {
                    "active": True,
                    "queued": False,
                    "completed": False,
                    "progress": progress,
                    "eta": eta,
                    "live_preview": live_preview,
                    "id_live_preview": id_live_preview,
                    "textinfo": self.textinfo,
                    "sampling_step": self.sampling_step,
                    "sampling_steps": self.sampling_steps,
                    "job_no": self.job_no,
                    "job_count": self.job_count
                }

                # Broadcast in background to avoid blocking generation
                import asyncio
                asyncio.create_task(websocket_manager.broadcast_task_progress(current_task, progress_data))

        except Exception as e:
            # Don't let WebSocket broadcasting errors interrupt generation
            print(f"WebSocket progress broadcast error: {e}")
