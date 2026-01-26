# VITE UI

import time
import threading
import asyncio
from .workspace_manager import WorkspaceManager
from modules.progress import websocket_manager
import modules.shared as shared
from modules.shared import opts
from fastapi import Request, HTTPException
from typing import Any

import modules.api.models as models


class ViteAPI:
    def __init__(self, api):
        self.api = api
        self.workspace_manager = WorkspaceManager(self.api)
        self.register_routes(api)

    def get_workspace_manager(self):
        """Get the workspace manager instance"""
        return self.workspace_manager

    def progress_broadcaster(self, task_id, job_type):
        """Broadcast progress updates periodically during generation"""
        try:
            start_time = time.time()
            last_progress = -1

            # Give a small delay to ensure current_task is set
            time.sleep(0.1)

            while self._should_continue_broadcasting(task_id, job_type, start_time):
                current_progress = self._calculate_progress(job_type)
                if current_progress != last_progress:
                    progress_data = self._build_progress_data(current_progress, task_id)
                    websocket_manager.broadcast_task_progress_sync(task_id, progress_data)
                    last_progress = current_progress
                time.sleep(0.5)  # Update every 0.5 seconds)
        except Exception as e:
            print(f"Progress broadcaster error: {e}")

    def _should_continue_broadcasting(self, task_id, job_type, start_time):
        """Check if progress broadcasting should continue"""
        max_duration = 300  # Max 5 minutes
        # Allow sampling_step to be 0 or greater (not just != -1)
        # For multi-iteration jobs, the job name changes to "Batch X out of Y",
        # so we check that we're still in an active job rather than exact name match
        should_continue = (
            shared.state.job and  # Any non-empty job indicates active processing
            shared.state.sampling_step >= 0 and
            (time.time() - start_time) < max_duration
        )
        return should_continue

    def _calculate_progress(self, job_type):
        """Calculate current progress percentage across all iterations"""
        job_count, job_no = shared.state.job_count, shared.state.job_no
        sampling_steps, sampling_step = shared.state.sampling_steps, shared.state.sampling_step

        progress = 0

        # Handle case where job_count hasn't been set yet (still -1)
        if job_count <= 0:
            # Fall back to single-batch progress calculation
            if sampling_steps > 0:
                progress = min(sampling_step / sampling_steps, 1.0)
        else:
            # Multi-batch progress calculation
            # Add progress for completed batches
            progress += job_no / job_count

            # Add progress within current batch
            if sampling_steps > 0:
                progress += 1 / job_count * sampling_step / sampling_steps

        return min(progress, 1.0)

    def _build_progress_data(self, current_progress, task_id=None):
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

        # Calculate batch information
        current_batch = shared.state.job_no + 1 if shared.state.job_count > 0 else 1
        total_batches = shared.state.job_count if shared.state.job_count > 0 else 1

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
            "current_batch": current_batch,
            "total_batches": total_batches,
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
            "current_batch": shared.state.job_count,
            "total_batches": shared.state.job_count,
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

    def register_routes(self, api):
        # ViteUI specific endpoints
        api.add_api_route("/viteapi/txt2img", self.viteapi_txt2img, methods=["POST"])
        api.add_api_route("/viteapi/img2img", self.viteapi_img2img, methods=["POST"])
        api.add_api_route("/viteapi/extras", self.viteapi_extras, methods=["POST"])


    async def viteapi_txt2img(self, request: Request):
        """ViteUI txt2img endpoint that loads images from workspace instead of accepting base64 from client"""

        # Get request body as JSON
        try:
            request_dict = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid JSON request")


        workspace_name = request_dict.get('workspace_name')

        if not workspace_name:
            raise HTTPException(status_code=422, detail="workspace_name is required")

        # Create the StableDiffusionTxt2ImgProcessingAPI object from the request dict
        txt2img_request = models.StableDiffusionTxt2ImgProcessingAPI(**request_dict)
        
        return await self.txt2imgapi_async(txt2img_request)
        # return self.api.text2imgapi(txt2img_request)

    async def txt2imgapi_async(self, txt2imgreq):
        """Async wrapper for txt2imgapi that prevents blocking the event loop"""
        # Run the synchronous API call in a thread pool
        return await asyncio.to_thread(self.api.text2imgapi, txt2imgreq)

    def _load_image_from_workspace(self, workspace_name: str, workspace_image_path: str) -> str:
        """Generalized helper to load an image from workspace and convert to base64 data URL.
        
        Args:
            workspace_name: Name of the workspace
            workspace_image_path: Relative path within workspace (e.g., "commits/genid/full.webp")
            
        Returns:
            Base64 data URL string (e.g., "data:image/png;base64,...")
            
        Raises:
            HTTPException: If workspace_name or workspace_image_path is missing, or if image cannot be loaded
        """
        import base64
        import io
        from fastapi import HTTPException
        import modules.images as images

        if not workspace_name:
            raise HTTPException(status_code=422, detail="workspace_name is required")
        if not workspace_image_path:
            raise HTTPException(status_code=422, detail="workspace_image_path is required")

        # Load image from workspace
        try:
            image_path = self.workspace_manager.resolve_workspace_file(workspace_name, workspace_image_path)
            if not image_path.exists():
                raise HTTPException(status_code=404, detail=f"Image not found at {workspace_image_path} in workspace {workspace_name}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"VITE-UI-API: Failed to resolve workspace file: {str(e)}")
            raise HTTPException(status_code=404, detail=f"Failed to resolve workspace file: {str(e)}")

        # Convert image to base64
        try:
            print(f"VITE-UI-API: Loading image from workspace: {workspace_name}, path: {workspace_image_path}")
            image = images.read(image_path)
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            image_data_url = f"data:image/png;base64,{image_base64}"
            return image_data_url
        except Exception as e:
            print(f"VITE-UI-API: Failed to process image: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

    async def viteapi_img2img(self, request: Request):
        """ViteUI img2img endpoint that loads images from workspace instead of accepting base64 from client"""
        # Get request body as JSON
        try:
            request_dict = await request.json()
        except Exception as e:
            print(f"VITE-UI-API: Failed to get request body: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON request")

        # Extract parameters from request
        genid = request_dict.get('genid')
        workspace_name = request_dict.get('workspace_name')

        if not genid:
            raise HTTPException(status_code=422, detail="genid is required")
        if not workspace_name:
            raise HTTPException(status_code=422, detail="workspace_name is required")

        # Load image from workspace using generalized helper
        workspace_image_path = f"commits/{genid}/full.webp"
        image_data_url = self._load_image_from_workspace(workspace_name, workspace_image_path)

        # Create a new request dict with init_images instead of genid
        img2img_request_dict = dict[Any, Any](request_dict)  # Copy the original request
        img2img_request_dict['init_images'] = [image_data_url]
        if 'genid' in img2img_request_dict:
            del img2img_request_dict['genid']

        # Convert back to Pydantic model for the API call
        import modules.api.models as models
        try:
            img2img_request = models.StableDiffusionImg2ImgProcessingAPI(**img2img_request_dict)
        except Exception as e:
            print(f"VITE-UI-API: Failed to create img2img request: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Invalid request parameters: {str(e)}")

        # Call the async img2img API wrapper
        return await self.img2imgapi_async(img2img_request)

    async def img2imgapi_async(self, img2imgreq):
        """Async wrapper for img2imgapi that prevents blocking the event loop"""
        # Run the synchronous API call in a thread pool
        return await asyncio.to_thread(self.api.img2imgapi, img2imgreq)

    async def viteapi_extras(self, request: Request):
        """ViteUI extras endpoint that loads images from workspace instead of accepting base64 from client"""
        # Get request body as JSON
        try:
            request_dict = await request.json()
        except Exception as e:
            print(f"VITE-UI-API: Failed to get request body: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON request")

        # Extract parameters from request
        workspace_name = request_dict.get('workspace_name')
        workspace_image_path = request_dict.get('workspace_image_path')

        # If workspace_image_path is provided, load from workspace; otherwise fall back to base64 image
        if workspace_image_path and workspace_name:
            # Load image from workspace using generalized helper
            image_data_url = self._load_image_from_workspace(workspace_name, workspace_image_path)
            
            # Create a new request dict with image instead of workspace_image_path
            extras_request_dict = dict[Any, Any](request_dict)  # Copy the original request
            extras_request_dict['image'] = image_data_url
            if 'workspace_image_path' in extras_request_dict:
                del extras_request_dict['workspace_image_path']
        else:
            # Fall back to using image from request (base64)
            extras_request_dict = request_dict
            if not extras_request_dict.get('image'):
                raise HTTPException(status_code=422, detail="Either workspace_image_path+workspace_name or image (base64) is required")

        # Convert to Pydantic model for the API call
        import modules.api.models as models
        try:
            extras_request = models.ExtrasSingleImageRequest(**extras_request_dict)
        except Exception as e:
            print(f"VITE-UI-API: Failed to create extras request: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Invalid request parameters: {str(e)}")

        # Call the async extras API wrapper
        return await self.extrasapi_async(extras_request)

    async def extrasapi_async(self, extrasreq):
        """Async wrapper for extras_single_image_api that prevents blocking the event loop"""
        # Run the synchronous API call in a thread pool
        return await asyncio.to_thread(self.api.extras_single_image_api, extrasreq)
