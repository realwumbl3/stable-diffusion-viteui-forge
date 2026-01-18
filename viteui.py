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

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from modules import timer
from modules import initialize_util
from modules import initialize
from modules_forge.initialization import initialize_forge

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
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    from pathlib import Path
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

    # Create a sub-application for /api prefix to match client expectations
    # The client uses http://localhost:7861/api as base URL
    api_subapp = FastAPI()
    initialize_util.setup_middleware(api_subapp)
    app.mount("/api", api_subapp)

    # Create API endpoints on the sub-app (so they're accessible at /api/*)
    # This makes /api/workspaces, /api/sdapi/v1/*, etc. work
    api = create_api(api_subapp)

    # Source maps are now inline, no need for separate routes

    # Setup progress API routes on the sub-app as well
    from modules.progress import setup_progress_api
    setup_progress_api(api_subapp)
    
    # Also setup progress API on main app for /internal/* routes
    setup_progress_api(app)

    # Trigger app started callbacks for extensions
    from modules import script_callbacks
    script_callbacks.app_started_callback(None, app)

    # Serve static files from client/dist if it exists
    client_dist_path = Path(__file__).parent / "client" / "dist"
    if client_dist_path.exists() and client_dist_path.is_dir():
        # Mount assets directory for JS, CSS, and other hashed assets
        assets_path = client_dist_path / "assets"
        if assets_path.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

        # Serve all static files and SPA
        # This catch-all route must be registered last so API routes take precedence
        @app.get("/{path:path}")
        async def serve_static_and_spa(path: str, request: Request):
            """
            Serve static files (including import maps, manifests, vite.svg, etc.) and SPA.
            API routes (/api/*, /sdapi/*, /workspaces/*, /docs, /ws, etc.) are handled by their respective routers.
            """
            # Don't serve for API routes, docs, websocket, or other special paths
            # Note: /api/* routes are handled by the mounted sub-app, so they won't reach here
            if path.startswith(("sdapi/", "workspaces/", "docs", "redoc", "openapi.json", "ws", "internal/", "assets/")):
                # Let FastAPI handle these routes normally (though they shouldn't reach here)
                return None
            
            # Check if it's a file in the dist directory (including root files like vite.svg, import maps, etc.)
            file_path = client_dist_path / path
            # Ensure the file is within the dist directory (security check)
            try:
                file_path.resolve().relative_to(client_dist_path.resolve())
            except ValueError:
                # Path is outside dist directory, don't serve it
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=404, content={"detail": "Not found"})
            
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            
            # Otherwise serve index.html for SPA routing
            index_path = client_dist_path / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            
            # If index.html doesn't exist, return 404
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        
        print(f"Static files will be served from: {client_dist_path}")
    else:
        print(f"Warning: Client dist directory not found at {client_dist_path}")
        print("Build the client with 'cd client && npm run build' to serve it from the API server")

    print(f"API startup time: {startup_timer.summary()}.")
    print("API server is now online and ready to accept requests!")
    print("API documentation: http://localhost:7861/docs")
    print("WebSocket progress: ws://localhost:7861/ws")
    if client_dist_path.exists():
        print("Frontend UI: http://localhost:7861")

    # Include the router in the sub-app (though routes are added directly via add_api_route)
    api.app.include_router(api.router)
    
    # Launch the main app (not the sub-app) so static files and SPA are served
    import uvicorn
    import modules.shared as shared
    uvicorn.run(
        app,  # Run the main app, not the sub-app
        host=initialize_util.server_name(),
        port=cmd_opts.port if cmd_opts.port else 7861,
        timeout_keep_alive=shared.cmd_opts.timeout_keep_alive,
        root_path=f"/{getattr(cmd_opts, 'subpath', '')}" if getattr(cmd_opts, 'subpath', '') else "",
        ssl_keyfile=shared.cmd_opts.tls_keyfile,
        ssl_certfile=shared.cmd_opts.tls_certfile
    )


if __name__ == "__main__":
    api_worker()