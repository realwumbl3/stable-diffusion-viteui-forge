# VITE UI

import time
import threading
import asyncio
from .workspace_manager import WorkspaceManager
from modules.progress import websocket_manager, current_task
import modules.shared as shared
from modules.shared import opts


class ViteAPI:
    def __init__(self, api):
        self.api = api
        self.workspace_manager = WorkspaceManager(self.api)

    def register_routes(self, api):
        """Register all viteapi routes with the API instance"""
        # Register workspace routes
        self.workspace_manager.register_routes(api)

    def get_workspace_manager(self):
        """Get the workspace manager instance"""
        return self.workspace_manager

    def progress_broadcaster(self, task_id, job_type):
        """Broadcast progress updates periodically during generation"""
        try:
            start_time = time.time()
            last_progress = -1
            while self._should_continue_broadcasting(task_id, job_type, start_time):
                current_progress = self._calculate_progress(job_type)
                if current_progress != last_progress:
                    progress_data = self._build_progress_data(current_progress, task_id)
                    websocket_manager.broadcast_task_progress_sync(task_id, progress_data)
                    last_progress = current_progress
                time.sleep(0.5)  # Update every 0.5 seconds
        except Exception as e:
            print(f"Progress broadcaster error: {e}")

    def _should_continue_broadcasting(self, task_id, job_type, start_time):
        """Check if progress broadcasting should continue"""
        max_duration = 300  # Max 5 minutes
        return (
            shared.state.job == job_type and
            current_task == task_id and
            shared.state.sampling_step != -1 and
            (time.time() - start_time) < max_duration
        )

    def _calculate_progress(self, job_type):
        """Calculate current progress percentage"""
        if shared.state.sampling_steps > 0:
            return min(shared.state.sampling_step / shared.state.sampling_steps, 1.0)
        return 0.01

    def _build_progress_data(self, current_progress):
        """Build progress data dictionary for broadcasting"""
        import io
        import base64

        elapsed = time.time() - shared.state.time_start
        eta = None
        if current_progress > 0:
            predicted_duration = elapsed / current_progress
            eta = predicted_duration - elapsed

        # Include live preview if enabled
        live_preview = None
        id_live_preview = getattr(shared.state, 'id_live_preview', -1)

        if opts.live_previews_enable:
            shared.state.set_current_image()
            if shared.state.current_image is not None:
                buffered = io.BytesIO()
                if opts.live_previews_image_format == "png":
                    # using optimize for large images takes an enormous amount of time
                    if max(*shared.state.current_image.size) <= 256:
                        save_kwargs = {"optimize": True}
                    else:
                        save_kwargs = {"optimize": False, "compress_level": 1}
                else:
                    save_kwargs = {}

                shared.state.current_image.save(buffered, format=opts.live_previews_image_format, **save_kwargs)
                base64_image = base64.b64encode(buffered.getvalue()).decode('ascii')
                live_preview = f"data:image/{opts.live_previews_image_format};base64,{base64_image}"
                id_live_preview = shared.state.id_live_preview

        return {
            "active": True,
            "queued": False,
            "completed": False,
            "progress": current_progress,
            "eta": eta,
            "live_preview": live_preview,
            "id_live_preview": id_live_preview,
            "textinfo": shared.state.textinfo or "Generating...",
            "sampling_step": shared.state.sampling_step,
            "sampling_steps": shared.state.sampling_steps,
            "timestamp": time.time(),
        }

    def start_progress_broadcasting(self, task_id, job_type):
        """Start a background thread to broadcast progress updates during generation"""
        progress_thread = threading.Thread(
            target=self.progress_broadcaster,
            args=(task_id, job_type),
            daemon=True
        )
        progress_thread.start()
        return progress_thread

    def send_completion_message(self, task_id):
        """Send completion message after generation"""
        completion_data = {
            "active": False,
            "queued": False,
            "completed": True,
            "progress": 1.0,
            "eta": None,
            "textinfo": "Completed",
            "sampling_step": shared.state.sampling_steps,
            "sampling_steps": shared.state.sampling_steps,
            "timestamp": time.time(),
        }
        websocket_manager.broadcast_task_progress_sync(task_id, completion_data)

    def cleanup_after_generation(self, task_id, progress_thread):
        """Clean up after generation completes"""
        # Signal the progress thread to stop
        shared.state.job = ""
        shared.state.sampling_step = -1

        # Wait for progress thread to finish
        progress_thread.join(timeout=2)

    async def img2imgapi_async(self, img2imgreq):
        """Async wrapper for img2imgapi that prevents blocking the event loop"""
        # Run the synchronous API call in a thread pool
        return await asyncio.to_thread(self.api.img2imgapi, img2imgreq)