from __future__ import annotations
import json
import asyncio
import threading
import time
from typing import Dict, Set
from pydantic import Field
from fastapi import WebSocket, WebSocketDisconnect
import modules.shared as shared

class WebSocketProgressManager:
    """Manages WebSocket connections for real-time progress updates"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # task_id -> set of websockets
        self._lock: asyncio.Lock | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    def _get_lock(self) -> asyncio.Lock:
        """Get or create the asyncio lock for the current event loop"""
        current_loop = asyncio.get_running_loop()
        if self._lock is None or self._loop != current_loop:
            self._lock = asyncio.Lock()
            self._loop = current_loop
        return self._lock

    async def connect(self, websocket: WebSocket, task_id: str = None):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        async with self._get_lock():
            if task_id not in self.active_connections:
                self.active_connections[task_id] = set()
            self.active_connections[task_id].add(websocket)
            print(f"VITE-UI-API: WebSocket connected for task {task_id}. Total connections for task: {len(self.active_connections[task_id])}")

    async def disconnect(self, websocket: WebSocket, task_id: str = None):
        """Remove a WebSocket connection"""
        async with self._get_lock():
            if task_id and task_id in self.active_connections:
                self.active_connections[task_id].discard(websocket)
                # print(f"VITE-UI-API: WebSocket disconnected for task {task_id}. Remaining: {len(self.active_connections.get(task_id, []))}")
                # Clean up empty task sets
                if not self.active_connections[task_id]:
                    del self.active_connections[task_id]

    async def broadcast_progress(self, progress_data: Dict):
        """Broadcast progress update to all connected clients"""
        message = json.dumps(progress_data)

        # Create a copy of connections to avoid modification during iteration
        async with self._get_lock():
            connections_to_remove = set()

            # Flatten all connections from all tasks
            all_connections = set()
            for task_connections in self.active_connections.values():
                all_connections.update(task_connections)

            if not all_connections:
                return

            for connection in all_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Connection is dead, mark for removal
                    connections_to_remove.add(connection)

            # Remove dead connections from all task sets
            for task_id, task_connections in self.active_connections.items():
                self.active_connections[task_id] -= connections_to_remove
                # Clean up empty task sets
                if not self.active_connections[task_id]:
                    del self.active_connections[task_id]

    async def broadcast_task_progress(self, task_id: str, progress_data: Dict):
        """Broadcast progress update for a specific task"""
        message_data = {
            "task_id": task_id,
            **progress_data
        }
        message = json.dumps(message_data)

        async with self._get_lock():
            connections_to_remove = set()

            # Only send to connections subscribed to this task
            task_connections = self.active_connections.get(task_id, set())
            
            if not task_connections:
                return

            for connection in task_connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    # Connection is dead, mark for removal
                    print(f"VITE-UI-API: Failed to send to connection for task {task_id}: {e}")
                    connections_to_remove.add(connection)

            # Remove dead connections
            if task_id in self.active_connections:
                self.active_connections[task_id] -= connections_to_remove
                # Clean up empty task sets
                if not self.active_connections[task_id]:
                    del self.active_connections[task_id]

    def broadcast_task_progress_sync(self, task_id: str, progress_data: Dict):
        """Synchronous version of broadcast_task_progress for use in non-async contexts"""
        if task_id is None:
            return

        try:
            # Check if we're in an event loop
            loop = asyncio.get_running_loop()
            if loop.is_running():
                # Schedule the coroutine in the running loop
                # Use call_soon_threadsafe to be safe from any thread
                loop.call_soon_threadsafe(
                    lambda: asyncio.create_task(self.broadcast_task_progress(task_id, progress_data))
                )
                return
        except RuntimeError:
            # No event loop in current thread
            pass

        # If we reach here, we are in a synchronous thread
        self._ensure_background_loop()
        
        if self._bg_loop and self._bg_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast_task_progress(task_id, progress_data), 
                self._bg_loop
            )

    def broadcast_progress_hook(self, req_id_task, response):
        """Hook to be called from progressapi to handle broadcasting"""
        if req_id_task and self:
            broadcast_data = response.dict()
            broadcast_data["timestamp"] = time.time()
            self.broadcast_task_progress_sync(req_id_task, broadcast_data)
        return response

    def _ensure_background_loop(self):
        """Ensure a background event loop is running for synchronous broadcasts"""
        if hasattr(self, '_bg_loop') and self._bg_loop and self._bg_loop.is_running():
            return

        def start_loop(loop):
            asyncio.set_event_loop(loop)
            loop.run_forever()

        self._bg_loop = asyncio.new_event_loop()
        thread = threading.Thread(target=start_loop, args=(self._bg_loop,), daemon=True)
        thread.start()
        
        # Give it a moment to start
        time.sleep(0.01)

# Global WebSocket manager instance
websocket_manager = WebSocketProgressManager()

async def websocket_progress_endpoint(websocket: WebSocket, task_id: str | None = None):
    """WebSocket endpoint for real-time progress updates"""
    from urllib.parse import parse_qs, unquote
    
    query_string = websocket.url.query
    query_params = parse_qs(query_string)

    if 'task_id' in query_params and query_params['task_id']:
        task_id = unquote(query_params['task_id'][0])

    await websocket_manager.connect(websocket, task_id)
    try:
        await websocket.send_text(json.dumps({"type": "connected", "task_id": task_id}))
        while True:
            try:
                data = await websocket.receive_text()
                await websocket.send_text(json.dumps({"type": "pong", "data": data}))
            except WebSocketDisconnect:
                break
    except Exception as e:
        print(f"VITE-UI-API: WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(websocket, task_id)

def get_extra_progress_data():
    """Calculate extra batch and sampling information"""
    job_count, job_no = shared.state.job_count, shared.state.job_no
    current_batch = job_no + 1 if job_count > 0 else None
    total_batches = job_count if job_count > 0 else None
    
    return {
        "current_batch": current_batch,
        "total_batches": total_batches,
        "sampling_step": shared.state.sampling_step,
        "sampling_steps": shared.state.sampling_steps
    }

def broadcast_progress(task_id: str, progress_data: Dict):
    """Helper to broadcast progress via the global websocket manager"""
    websocket_manager.broadcast_task_progress_sync(task_id, progress_data)

def setup_viteapi_progress(app):
    """Setup ViteAPI specific progress routes"""
    app.add_websocket_route("/internal/progress-ws", websocket_progress_endpoint)

def patch_progress_module(progress_globals):
    """Surgically patch the progress module with ViteAPI extensions"""
    from pydantic import Field
    import time

    # 1. Patch ProgressResponse with extra fields
    ProgressResponse = progress_globals.get('ProgressResponse')
    if ProgressResponse:
        ProgressResponse.__annotations__.update({
            'current_batch': int | None,
            'total_batches': int | None,
            'sampling_step': int | None,
            'sampling_steps': int | None,
        })
        # Set default values for new fields
        setattr(ProgressResponse, 'current_batch', Field(default=None, title="Current batch number"))
        setattr(ProgressResponse, 'total_batches', Field(default=None, title="Total batches"))
        setattr(ProgressResponse, 'sampling_step', Field(default=None, title="Current sampling step"))
        setattr(ProgressResponse, 'sampling_steps', Field(default=None, title="Total sampling steps"))
        # Re-build the model to recognize new fields
        ProgressResponse.model_rebuild(force=True)

    # 2. Patch setup_progress_api
    original_setup = progress_globals.get('setup_progress_api')
    if original_setup:
        def patched_setup(app):
            original_setup(app)
            setup_viteapi_progress(app)
            return app
        progress_globals['setup_progress_api'] = patched_setup

    # 3. Patch progressapi
    original_progressapi = progress_globals.get('progressapi')
    if original_progressapi:
        def patched_progressapi(req):
            response = original_progressapi(req)
            
            # Add extra data
            extra_data = get_extra_progress_data()
            for k, v in extra_data.items():
                setattr(response, k, v)
                
            # Broadcast via WebSocket
            if req.id_task and websocket_manager:
                broadcast_data = response.dict()
                broadcast_data["timestamp"] = time.time()
                websocket_manager.broadcast_task_progress_sync(req.id_task, broadcast_data)
                
            return response
        progress_globals['progressapi'] = patched_progressapi

    # 4. Inject WebSocket endpoint and other helpers
    progress_globals['websocket_progress_endpoint'] = websocket_progress_endpoint
    progress_globals['websocket_manager'] = websocket_manager
    progress_globals['setup_viteapi_progress'] = setup_viteapi_progress
    progress_globals['get_extra_progress_data'] = get_extra_progress_data

    # 5. Register callback
    try:
        from modules import script_callbacks
        def register_progress_api(demo, app):
            progress_globals['setup_progress_api'](app)
        script_callbacks.on_app_started(register_progress_api)
    except ImportError:
        pass

def patch_shared_state(state_globals):
    """Surgically patch modules.shared_state with ViteAPI extensions"""
    import torch
    
    State = state_globals.get('State')
    if not State:
        return

    # Helper to broadcast progress
    def broadcast_progress_update(self):
        """Broadcast current progress state via WebSocket"""
        from modules import progress as progress_module
        if not progress_module.current_task:
            return

        extra_data = get_extra_progress_data()
        
        # Calculate standard progress
        progress = 0
        job_count, job_no = self.job_count, self.job_no
        sampling_steps, sampling_step = self.sampling_steps, self.sampling_step

        if job_count > 0:
            progress += job_no / job_count
        if sampling_steps > 0 and job_count > 0:
            progress += 1 / job_count * sampling_step / sampling_steps
        progress = min(progress, 1)

        # Basic progress data
        progress_data = {
            "active": True,
            "queued": False,
            "completed": False,
            "progress": progress,
            "textinfo": self.textinfo,
            "sampling_step": self.sampling_step,
            "sampling_steps": self.sampling_steps,
            "job_no": self.job_no,
            "job_count": self.job_count,
            **extra_data,
            "timestamp": time.time(),
        }

        websocket_manager.broadcast_task_progress_sync(progress_module.current_task, progress_data)

    # Patch set_current_image to broadcast progress even if no preview is generated
    original_set_current_image = State.set_current_image
    @torch.inference_mode()
    def patched_set_current_image(self):
        if not shared.parallel_processing_allowed:
            return
        
        # Check if we should generate live preview
        should_generate_preview = (self.sampling_step - self.current_image_sampling_step >= shared.opts.show_progress_every_n_steps
                                  and shared.opts.live_previews_enable and shared.opts.show_progress_every_n_steps != -1)

        # Always broadcast progress at regular intervals
        progress_interval = max(5, shared.opts.show_progress_every_n_steps) if shared.opts.show_progress_every_n_steps > 0 else 5
        should_broadcast_progress = (self.sampling_step % progress_interval == 0)

        if should_generate_preview:
            self.do_set_current_image()
        elif should_broadcast_progress:
            broadcast_progress_update(self)

    State.set_current_image = patched_set_current_image

    # Patch assign_current_image to always broadcast
    original_assign_current_image = State.assign_current_image
    @torch.inference_mode()
    def patched_assign_current_image(self, image):
        original_assign_current_image(self, image)
        broadcast_progress_update(self)
        
    State.assign_current_image = patched_assign_current_image

def patch_call_queue(queue_globals):
    """Surgically patch modules.call_queue with ViteAPI extensions"""
    from functools import wraps
    
    # Patch wrap_gradio_gpu_call to broadcast task status
    original_wrap_gradio_gpu_call = queue_globals.get('wrap_gradio_gpu_call')
    if not original_wrap_gradio_gpu_call:
        return

    def patched_wrap_gradio_gpu_call(func, extra_outputs=None):
        f_original = original_wrap_gradio_gpu_call(func, extra_outputs)
        
        @wraps(func)
        def f_patched(*args, **kwargs):
            # Extract task ID if present
            id_task = None
            if args and isinstance(args[0], str) and args[0].startswith("task(") and args[0].endswith(")"):
                id_task = args[0]

            # Broadcast task started
            if id_task:
                websocket_manager.broadcast_task_progress_sync(id_task, {
                    "active": True,
                    "queued": False,
                    "completed": False,
                    "progress": 0,
                    "textinfo": "Starting task...",
                    "timestamp": time.time()
                })

            try:
                # We need to reach into the closure of the original wrapped function or just re-implement the wrap logic
                # Since the original wrap_gradio_gpu_call is quite complex, it's safer to let it run and just hook the start/success/fail.
                # However, the original Forge wrap_gradio_gpu_call matches the one in modules/call_queue.py
                # except for the broadcasting lines.
                
                res = f_original(*args, **kwargs)
                
                # Broadcast task completed successfully
                if id_task:
                    websocket_manager.broadcast_task_progress_sync(id_task, {
                        "active": False,
                        "queued": False,
                        "completed": True,
                        "progress": 1,
                        "textinfo": "Task completed successfully",
                        "timestamp": time.time()
                    })
                return res
            except Exception as e:
                # Broadcast task failed
                if id_task:
                    websocket_manager.broadcast_task_progress_sync(id_task, {
                        "active": False,
                        "queued": False,
                        "completed": True,
                        "timestamp": time.time(),
                        "progress": 0,
                        "textinfo": f"Task failed: {str(e)}"
                    })
                raise
        
        return f_patched

    queue_globals['wrap_gradio_gpu_call'] = patched_wrap_gradio_gpu_call
