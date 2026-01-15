from __future__ import annotations
import base64
import io
import time
import json
import asyncio
from typing import Dict, Set

import gradio as gr
from pydantic import BaseModel, Field
from fastapi import WebSocket, WebSocketDisconnect, Path

from modules.shared import opts

import modules.shared as shared
from collections import OrderedDict
import string
import random
from typing import List

current_task = None
pending_tasks = OrderedDict()
finished_tasks = []
recorded_results = []
recorded_results_limit = 2


class WebSocketProgressManager:
    """Manages WebSocket connections for real-time progress updates"""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        # Capture the loop that owns the asyncio lock
        if self._loop is None:
            self._loop = asyncio.get_running_loop()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast_progress(self, progress_data: Dict):
        """Broadcast progress update to all connected clients"""
        message = json.dumps(progress_data)

        # Create a copy of connections to avoid modification during iteration
        async with self._lock:
            connections_to_remove = set()

            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Connection is dead, mark for removal
                    connections_to_remove.add(connection)

            # Remove dead connections
            self.active_connections -= connections_to_remove

    async def broadcast_task_progress(self, task_id: str, progress_data: Dict):
        """Broadcast progress update for a specific task"""
        message_data = {
            "task_id": task_id,
            **progress_data
        }
        await self.broadcast_progress(message_data)

    def broadcast_task_progress_sync(self, task_id: str, progress_data: Dict):
        """Synchronous version of broadcast_task_progress for use in non-async contexts"""
        import asyncio
        import threading

        def run_async():
            """Run the async broadcast in a new event loop"""
            try:
                asyncio.run(self.broadcast_task_progress(task_id, progress_data))
            except Exception as e:
                print(f"WebSocket progress broadcast error: {e}")

        try:
            # Prefer the loop that owns the asyncio lock
            loop = self._loop or asyncio.get_running_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast_task_progress(task_id, progress_data), loop)
            else:
                asyncio.run_coroutine_threadsafe(self.broadcast_task_progress(task_id, progress_data), loop)
        except RuntimeError:
            # No running event loop available, start in a background thread
            thread = threading.Thread(target=run_async, daemon=True)
            thread.start()


# Global WebSocket manager instance
websocket_manager = WebSocketProgressManager()


def start_task(id_task):
    global current_task

    current_task = id_task
    pending_tasks.pop(id_task, None)


def finish_task(id_task):
    global current_task

    if current_task == id_task:
        current_task = None

    finished_tasks.append(id_task)
    if len(finished_tasks) > 16:
        finished_tasks.pop(0)

def create_task_id(task_type):
    N = 7
    res = ''.join(random.choices(string.ascii_uppercase +
    string.digits, k=N))
    return f"task({task_type}-{res})"

def record_results(id_task, res):
    recorded_results.append((id_task, res))
    if len(recorded_results) > recorded_results_limit:
        recorded_results.pop(0)


def add_task_to_queue(id_job):
    pending_tasks[id_job] = time.time()

class PendingTasksResponse(BaseModel):
    size: int = Field(title="Pending task size")
    tasks: List[str] = Field(title="Pending task ids")

class ProgressRequest(BaseModel):
    id_task: str = Field(default=None, title="Task ID", description="id of the task to get progress for")
    id_live_preview: int = Field(default=-1, title="Live preview image ID", description="id of last received last preview image")
    live_preview: bool = Field(default=True, title="Include live preview", description="boolean flag indicating whether to include the live preview image")


class ProgressResponse(BaseModel):
    active: bool = Field(title="Whether the task is being worked on right now")
    queued: bool = Field(title="Whether the task is in queue")
    completed: bool = Field(title="Whether the task has already finished")
    progress: float | None = Field(default=None, title="Progress", description="The progress with a range of 0 to 1")
    eta: float | None = Field(default=None, title="ETA in secs")
    live_preview: str | None = Field(default=None, title="Live preview image", description="Current live preview; a data: uri")
    id_live_preview: int | None = Field(default=None, title="Live preview image ID", description="Send this together with next request to prevent receiving same image")
    textinfo: str | None = Field(default=None, title="Info text", description="Info text used by WebUI.")


async def websocket_progress_endpoint(websocket: WebSocket, task_id: str | None = None):
    """WebSocket endpoint for real-time progress updates"""
    await websocket_manager.connect(websocket)
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({"type": "connected", "task_id": task_id}))

        # Keep connection alive and listen for client messages
        while True:
            try:
                # Wait for client messages (could be used for ping/pong or task subscription)
                data = await websocket.receive_text()
                # For now, just echo back to keep connection alive
                await websocket.send_text(json.dumps({"type": "pong", "data": data}))
            except WebSocketDisconnect:
                break
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(websocket)


def setup_progress_api(app):
    app.add_api_route("/internal/pending-tasks", get_pending_tasks, methods=["GET"])
    app.add_api_route("/internal/progress", progressapi, methods=["POST"], response_model=ProgressResponse)
    app.add_websocket_route("/internal/progress-ws", websocket_progress_endpoint)
    app.add_websocket_route("/internal/progress-ws/{task_id}", websocket_progress_endpoint)
    return app


# Register the progress API setup as an app started callback
def register_progress_api(demo, app):
    setup_progress_api(app)


# Import and register the callback
try:
    from modules import script_callbacks
    script_callbacks.on_app_started(register_progress_api)
except ImportError:
    # Fallback for when script_callbacks is not available
    pass


def get_pending_tasks():
    pending_tasks_ids = list(pending_tasks)
    pending_len = len(pending_tasks_ids)
    return PendingTasksResponse(size=pending_len, tasks=pending_tasks_ids)


def progressapi(req: ProgressRequest):
    active = req.id_task == current_task
    queued = req.id_task in pending_tasks
    completed = req.id_task in finished_tasks

    if not active:
        textinfo = "Waiting..."
        if queued:
            sorted_queued = sorted(pending_tasks.keys(), key=lambda x: pending_tasks[x])
            queue_index = sorted_queued.index(req.id_task)
            textinfo = "In queue: {}/{}".format(queue_index + 1, len(sorted_queued))
        return ProgressResponse(active=active, queued=queued, completed=completed, id_live_preview=-1, textinfo=textinfo)

    progress = 0

    job_count, job_no = shared.state.job_count, shared.state.job_no
    sampling_steps, sampling_step = shared.state.sampling_steps, shared.state.sampling_step

    if job_count > 0:
        progress += job_no / job_count
    if sampling_steps > 0 and job_count > 0:
        progress += 1 / job_count * sampling_step / sampling_steps

    progress = min(progress, 1)

    elapsed_since_start = time.time() - shared.state.time_start
    predicted_duration = elapsed_since_start / progress if progress > 0 else None
    eta = predicted_duration - elapsed_since_start if predicted_duration is not None else None

    live_preview = None
    id_live_preview = req.id_live_preview

    if opts.live_previews_enable and req.live_preview:
        shared.state.set_current_image()
        if shared.state.id_live_preview != req.id_live_preview:
            image = shared.state.current_image
            if image is not None:
                buffered = io.BytesIO()

                if opts.live_previews_image_format == "png":
                    # using optimize for large images takes an enormous amount of time
                    if max(*image.size) <= 256:
                        save_kwargs = {"optimize": True}
                    else:
                        save_kwargs = {"optimize": False, "compress_level": 1}

                else:
                    save_kwargs = {}

                image.save(buffered, format=opts.live_previews_image_format, **save_kwargs)
                base64_image = base64.b64encode(buffered.getvalue()).decode('ascii')
                live_preview = f"data:image/{opts.live_previews_image_format};base64,{base64_image}"
                id_live_preview = shared.state.id_live_preview

    response = ProgressResponse(active=active, queued=queued, completed=completed, progress=progress, eta=eta, live_preview=live_preview, id_live_preview=id_live_preview, textinfo=shared.state.textinfo)

    # Broadcast progress update via WebSocket if there's an active task
    if req.id_task:
        progress_data = {
            "active": active,
            "queued": queued,
            "completed": completed,
            "progress": progress,
            "eta": eta,
            "live_preview": live_preview,
            "id_live_preview": id_live_preview,
            "textinfo": shared.state.textinfo,
            "timestamp": time.time()
        }
        # Broadcast in background to avoid blocking the API response
        websocket_manager.broadcast_task_progress_sync(req.id_task, progress_data)

    return response


def restore_progress(id_task):
    while id_task == current_task or id_task in pending_tasks:
        time.sleep(0.1)

    res = next(iter([x[1] for x in recorded_results if id_task == x[0]]), None)
    if res is not None:
        return res

    return gr.update(), gr.update(), gr.update(), f"Couldn't restore progress for {id_task}: results either have been discarded or never were obtained"
