"""
Stable Diffusion API Server (API-Only)

This module provides a FastAPI-based API server for Stable Diffusion image generation.
No web UI is included - this is a pure API service that can be consumed by external
web applications or clients.

The API provides endpoints for:
- Image generation from text prompts
- Image-to-image processing
- Model management and switching
- Extension integration
- Progress tracking via WebSocket

API Documentation: http://localhost:7861/docs (when running)
"""

from __future__ import annotations

import os

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from modules import timer
from modules import initialize_util
from modules import initialize
from modules_forge.initialization import initialize_forge
from modules_forge import main_thread

startup_timer = timer.startup_timer
startup_timer.record("api_launcher")

# Initialize the stable diffusion backend
initialize_forge()
initialize.imports()
initialize.check_versions()
initialize.initialize()


def _handle_api_exception(request: Request, e: Exception):
    """Global exception handler for API requests."""
    error_information = vars(e)
    content = {
        "error": type(e).__name__,
        "detail": error_information.get("detail", ""),
        "body": error_information.get("body", ""),
        "message": str(e),
    }
    return JSONResponse(status_code=int(error_information.get("status_code", 500)), content=jsonable_encoder(content))


def create_api(app):
    """Create and configure the API endpoints."""
    from modules.api.api import Api
    from modules.call_queue import queue_lock

    api = Api(app, queue_lock)
    return api


def api_worker():
    """
    Main API worker function.

    Sets up and launches the FastAPI server with all stable diffusion endpoints.
    This is the entry point for the API-only stable diffusion service.
    """
    from fastapi import FastAPI
    from modules.shared_cmd_options import cmd_opts

    # Create FastAPI application
    app = FastAPI(
        title="Stable Diffusion API",
        description="API for stable diffusion image generation",
        version="1.0.0",
        exception_handlers={Exception: _handle_api_exception}
    )

    # Setup middleware (CORS, etc.)
    initialize_util.setup_middleware(app)

    # Create API endpoints
    api = create_api(app)

    # Setup progress API routes
    from modules.progress import setup_progress_api
    setup_progress_api(app)

    # Trigger app started callbacks for extensions
    from modules import script_callbacks
    script_callbacks.app_started_callback(None, app)

    print(f"API startup time: {startup_timer.summary()}.")
    print("API server is now online and ready to accept requests!")
    print("API documentation: http://localhost:7861/docs")
    print("WebSocket progress: ws://localhost:7861/ws")

    # Launch the API server
    api.launch(
        server_name=initialize_util.server_name(),
        port=cmd_opts.port if cmd_opts.port else 7861,
        root_path=f"/{getattr(cmd_opts, 'subpath', '')}" if getattr(cmd_opts, 'subpath', '') else ""
    )


if __name__ == "__main__":
    api_worker()
