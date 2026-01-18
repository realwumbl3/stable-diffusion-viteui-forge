from pathlib import Path
from typing import Optional

from PIL import Image


class WorkspaceImageManager:
    def __init__(self, workspace_root: str = "workspaces", preview_max_size: int = 512):
        self.workspace_root = Path(workspace_root).resolve()
        self.preview_max_size = preview_max_size

    def resize_for_preview(self, image_path: Path, max_size: Optional[int] = None) -> Image.Image:
        max_size = max_size or self.preview_max_size
        if max_size <= 0:
            max_size = self.preview_max_size

        with Image.open(image_path) as image:
            width, height = image.size
            long_side = max(width, height)
            if long_side <= max_size:
                return image.copy()

            scale = max_size / float(long_side)
            new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
            return image.resize(new_size, Image.Resampling.LANCZOS)

    def save_preview(self, image_path: Path, output_path: Path, max_size: Optional[int] = None) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        preview_image = self.resize_for_preview(image_path, max_size=max_size)
        preview_image.save(output_path, format="PNG")
        return output_path
