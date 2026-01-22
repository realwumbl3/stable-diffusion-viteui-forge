# VITE UI
import mimetypes
from pathlib import Path
from typing import Callable

from fastapi import HTTPException
from fastapi.responses import FileResponse


class WorkspaceImageServer:
    def __init__(self, resolve_workspace_file_func: Callable[[str, str], Path], workspace_images):
        self.resolve_workspace_file = resolve_workspace_file_func
        self.workspace_images = workspace_images

    def serve_generation_asset(self, name: str, category: str, genid: str, asset: str):
        """Serve assets for a generation: meta.json, full.png, or 512.png"""
        try:
            # Construct the path: workspaces/<name>/<category>/<genid>/<asset>
            asset_path = self.resolve_workspace_file(name, f"{category}/{genid}/{asset}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        if not asset_path.exists():
            raise HTTPException(status_code=404, detail=f"Asset '{asset}' not found")

        # Set appropriate content type
        if asset.endswith('.json'):
            media_type = "application/json"
        elif asset.endswith('.png'):
            media_type = "image/png"
        else:
            media_type, _ = mimetypes.guess_type(str(asset_path))

        #+ Add CORS header to allow images to be read by canvas without tainting
        response = FileResponse(asset_path, media_type=media_type or "application/octet-stream")
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
        #+end
