# VITE UI
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from typing import Optional
import time
from pathlib import Path
from PIL import Image
from fastapi import HTTPException
from modules.shared import opts
from modules_viteapi.workspace_image_server import WorkspaceImageServer

class WorkspaceManager:
    def __init__(self, api, workspace_root: str = "workspaces", preview_max_size: int = 512):
        self.workspace_root = Path(workspace_root).resolve()
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        self.workspace_images = WorkspaceImageManager(workspace_root=str(workspace_root), preview_max_size=preview_max_size)
        self.image_server = WorkspaceImageServer(self.resolve_workspace_file, self.workspace_images)
        self.api = api
        self.register_routes(api)

    def list_workspaces(self) -> dict:
        workspaces = []
        for workspace_dir in self._iter_workspace_dirs():
            metadata = self._load_metadata(workspace_dir)
            workspaces.append({
                "name": self._relative_path(workspace_dir),
                "created": metadata.get("created"),
                "folders": metadata.get("folders", []),
            })

        # If no workspaces exist, create a default one
        if not workspaces:
            try:
                default_workspace = self.create_workspace({"name": "default"})
                if default_workspace.get("success"):
                    # Get the workspace path and load its metadata
                    workspace_path = self._resolve_workspace_path(default_workspace["name"])
                    metadata = self._load_metadata(workspace_path)
                    workspaces.append({
                        "name": metadata["name"],
                        "created": metadata.get("created"),
                        "folders": metadata.get("folders", []),
                    })
            except Exception as e:
                # If creation fails for any reason, just continue with empty list
                print(f"Warning: Failed to create default workspace: {e}")
                pass

        return {"workspaces": workspaces}

    def create_workspace(self, payload: dict) -> dict:
        name = payload.get("name") if isinstance(payload, dict) else None
        if not name:
            raise HTTPException(status_code=422, detail="Workspace name is required")

        workspace_path = self._resolve_workspace_path(name)
        if workspace_path.exists():
            return {"success": False, "name": self._relative_path(workspace_path), "message": f"Workspace '{self._relative_path(workspace_path)}' already exists"}

        workspace_path.mkdir(parents=True, exist_ok=False)
        (workspace_path / "commits").mkdir()
        (workspace_path / "rejects").mkdir()
        (workspace_path / "deleted").mkdir()
        (workspace_path / "candidates").mkdir()

        metadata = {
            "name": self._relative_path(workspace_path),
            "created": datetime.now().isoformat(),
            "folders": [],
        }
        self._save_metadata(workspace_path, metadata)
        return {"success": True, "name": metadata["name"], "message": f"Workspace '{metadata['name']}' created"}

    def ensure_workspace(self, name: str) -> dict:
        workspace_path = self._resolve_workspace_path(name)
        if workspace_path.exists():
            return {"created": False, "name": self._relative_path(workspace_path)}
        return self.create_workspace(name)

    def create_folder(self, relative_path: str) -> dict:
        folder_path = self._resolve_relative_path(relative_path)
        if folder_path.exists():
            return {"created": False, "path": self._relative_path(folder_path)}

        folder_path.mkdir(parents=True, exist_ok=False)
        return {"created": True, "path": self._relative_path(folder_path)}

    def list_generations(self, name: str) -> list[dict]:
        """List all generations in a workspace with their metadata"""
        workspace_path = self._resolve_workspace_path(name)
        generations = []

        # Helper function to process a category
        def process_category(category: str, status: str) -> None:
            category_path = workspace_path / category
            if not category_path.exists():
                return

            for genid_dir in category_path.iterdir():
                if not genid_dir.is_dir():
                    continue

                genid = genid_dir.name
                meta_path = genid_dir / "meta.json"

                if not meta_path.exists():
                    continue

                try:
                    # Read metadata
                    metadata = json.loads(meta_path.read_text(encoding="utf-8"))

                    # Extract generation info from metadata or create defaults
                    generation = {
                        "genid": genid,
                        "status": status,
                        "timestamp": metadata.get("timestamp", 0),
                        "source": metadata.get("source", "txt2img"),
                        "workspace": name,
                    }

                    # Add optional fields if present
                    if "prompt" in metadata:
                        generation["prompt"] = metadata["prompt"]
                    if "negative_prompt" in metadata:
                        generation["negative_prompt"] = metadata["negative_prompt"]
                    if "parameters" in metadata:
                        generation["parameters"] = metadata["parameters"]

                    generations.append(generation)

                except (json.JSONDecodeError, KeyError):
                    # Skip invalid metadata
                    continue

        # Process each category
        process_category("candidates", "candidate")
        process_category("commits", "commit")
        process_category("rejects", "reject")

        # Sort by timestamp descending
        generations.sort(key=lambda x: x["timestamp"], reverse=True)

        return generations

    def get_workspace_structure(self) -> dict:
        def build_tree(path: Path) -> dict:
            is_workspace = (path / "workspace.json").exists()

            # Workspaces are leaf nodes - they don't show children
            if is_workspace:
                children = []
            else:
                # Only populate children for non-workspace directories
                children = []
                for child in sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
                    if child.is_dir():
                        children.append(build_tree(child))

            if path == self.workspace_root:
                node_name = "workspaces"
                node_path = "workspaces"
            else:
                node_name = path.name
                node_path = self._relative_path(path)
            return {
                "name": node_name,
                "path": node_path,
                "type": "workspace" if is_workspace else "folder",
                "children": children,
            }

        return {"structure": build_tree(self.workspace_root)}

    def get_workspace_prompt(self, name: str) -> dict:
        workspace_path = self._resolve_workspace_path(name)
        prompt_path = self._prompt_file_path(workspace_path)
        if prompt_path.exists():
            try:
                data = json.loads(prompt_path.read_text(encoding="utf-8"))
            except Exception:
                data = {}
        else:
            data = {}
        return {
            "nodes": data.get("nodes", []),
        }

    def save_workspace_prompt(self, name: str, payload: dict) -> dict:
        workspace_path = self._resolve_workspace_path(name)
        prompt_path = self._prompt_file_path(workspace_path)
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_data = {
            "nodes": payload.get("nodes", []),
        }
        prompt_path.write_text(json.dumps(prompt_data, indent=2), encoding="utf-8")
        return prompt_data

    def save_generation_images(self, workspace_name: str, images: list, mask_image: Optional[object] = None, generation_metadata: Optional[dict] = None, destination: str = "candidates") -> list[str]:
        workspace_path = self._resolve_workspace_path(workspace_name)
        destination_root = workspace_path / destination
        destination_root.mkdir(parents=True, exist_ok=True)

        saved_paths = []
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        unique_seed = datetime.now().microsecond
        for idx, image in enumerate(images, start=1):
            candidate_id = f"{timestamp}_{unique_seed:06d}_{idx:03d}"
            candidate_path = destination_root / candidate_id
            candidate_path.mkdir(parents=True, exist_ok=False)

            # Create a temporary image file to pass to save_image_with_preview_and_meta
            temp_image_path = candidate_path / "temp_image.png"
            image.save(temp_image_path, format="PNG")

            # Save with new format (full.png, preview, meta.json)
            result = self.workspace_images.save_image_with_preview_and_meta(temp_image_path, candidate_path)

            # Remove temp file
            temp_image_path.unlink()

            # Update metadata with generation info
            if generation_metadata:
                # Merge generation metadata with existing image metadata
                updated_metadata = result["metadata"].copy()
                updated_metadata.update(generation_metadata)
                updated_metadata["timestamp"] = int(datetime.now().timestamp() * 1000)  # milliseconds

                # Save updated metadata
                meta_path = candidate_path / "meta.json"
                meta_path.write_text(json.dumps(updated_metadata, indent=2), encoding="utf-8")

            if mask_image is not None:
                mask_path = candidate_path / "mask.png"
                mask_image.save(mask_path, format="PNG")

            # Return path to full.png for backward compatibility
            saved_paths.append(self._workspace_relative_path(workspace_name, result["full_path"]))

        return saved_paths

    def commit_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="commits")

    def reject_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="rejects")

    def delete_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="deleted")

    def restore_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="candidates")

    def uncommit_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="candidates")

    def import_image(self, workspace_name: str, image_path: Path, mask_path: Optional[Path] = None) -> str:
        workspace_path = self._resolve_workspace_path(workspace_name)
        candidates_root = workspace_path / "candidates"
        candidates_root.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        candidate_id = f"{timestamp}_{datetime.now().microsecond:06d}"
        candidate_path = candidates_root / candidate_id
        candidate_path.mkdir(parents=True, exist_ok=False)

        # Save with new format (full.png, preview, meta.json)
        result = self.workspace_images.save_image_with_preview_and_meta(image_path, candidate_path)

        if mask_path and mask_path.exists():
            shutil.copy2(mask_path, candidate_path / "mask.png")

        # Return path to full.png for backward compatibility
        return self._workspace_relative_path(workspace_name, result["full_path"])

    def create_workspace_folder(self, payload: dict):
        path = payload.get("path") if isinstance(payload, dict) else None
        if not path:
            raise HTTPException(status_code=422, detail="Folder path is required")
        result = self.create_folder(path)
        if not result["created"]:
            return {"success": False, "message": "Folder already exists", "path": result["path"]}
        return {"success": True, "path": result["path"]}

    def move_workspace_item(self, payload: dict):
        source_path = payload.get("source_path")
        destination_path = payload.get("destination_path")

        if not source_path or not destination_path:
            raise HTTPException(status_code=422, detail="source_path and destination_path are required")

        # Resolve paths relative to workspace root
        source = self._resolve_relative_path(source_path)
        destination = self._resolve_relative_path(destination_path)

        # Check if source exists
        if not source.exists():
            raise HTTPException(status_code=404, detail=f"Source path does not exist: {source_path}")

        # Check if destination parent exists
        if not destination.parent.exists():
            raise HTTPException(status_code=404, detail=f"Destination parent does not exist: {destination.parent}")

        # Check if destination already exists
        if destination.exists():
            raise HTTPException(status_code=409, detail=f"Destination already exists: {destination_path}")

        # Perform the move
        try:
            source.rename(destination)
            return {
                "success": True,
                "source_path": source_path,
                "destination_path": destination_path
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to move item: {str(e)}")

    def rename_workspace_item(self, payload: dict):
        item_path = payload.get("item_path")
        new_name = payload.get("new_name")

        if not item_path or not new_name:
            raise HTTPException(status_code=422, detail="item_path and new_name are required")

        # Validate new name (no slashes, not empty, etc.)
        if "/" in new_name or "\\" in new_name or not new_name.strip():
            raise HTTPException(status_code=422, detail="Invalid name: cannot contain slashes and cannot be empty")

        # Resolve path relative to workspace root
        source = self._resolve_relative_path(item_path)

        # Check if source exists
        if not source.exists():
            raise HTTPException(status_code=404, detail=f"Item does not exist: {item_path}")

        # Create destination path
        destination = source.parent / new_name

        # Check if destination already exists
        if destination.exists():
            raise HTTPException(status_code=409, detail=f"An item with this name already exists: {new_name}")

        # Perform the rename
        try:
            source.rename(destination)
            return {
                "success": True,
                "old_path": item_path,
                "new_path": self._relative_path(destination)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to rename item: {str(e)}")

    def commit_workspace_image(self, name: str, payload: dict):
        image_path = payload.get("image_path") if isinstance(payload, dict) else None
        if not image_path:
            raise HTTPException(status_code=422, detail="image_path is required")
        try:
            result = self.commit_candidate(name, image_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"success": True, "commit_path": result["path"]}

    def reject_workspace_image(self, name: str, payload: dict):
        image_path = payload.get("image_path") if isinstance(payload, dict) else None
        if not image_path:
            raise HTTPException(status_code=422, detail="image_path is required")
        try:
            result = self.reject_candidate(name, image_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"success": True, "reject_path": result["path"]}

    def restore_workspace_image(self, name: str, payload: dict):
        image_path = payload.get("image_path") if isinstance(payload, dict) else None
        if not image_path:
            raise HTTPException(status_code=422, detail="image_path is required")
        try:
            result = self.restore_candidate(name, image_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"success": True, "restore_path": result["path"]}

    def uncommit_workspace_image(self, name: str, payload: dict):
        image_path = payload.get("image_path") if isinstance(payload, dict) else None
        if not image_path:
            raise HTTPException(status_code=422, detail="image_path is required")
        try:
            result = self.uncommit_candidate(name, image_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"success": True, "uncommit_path": result["path"]}

    def delete_workspace_image(self, name: str, payload: dict):
        image_path = payload.get("image_path") if isinstance(payload, dict) else None
        if not image_path:
            raise HTTPException(status_code=422, detail="image_path is required")
        try:
            result = self.delete_candidate(name, image_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"success": True, "delete_path": result["path"]}

    def import_workspace_image(self, name: str, payload: dict):
        from modules.api.api import decode_base64_to_image

        image_base64 = payload.get("image_base64") if isinstance(payload, dict) else None
        if not image_base64:
            raise HTTPException(status_code=422, detail="image_base64 is required")

        self.ensure_workspace(name)
        image = decode_base64_to_image(image_base64)
        temp_root = Path(opts.temp_dir or "tmp")
        temp_root.mkdir(parents=True, exist_ok=True)
        temp_file = temp_root / f"workspace_import_{time.time_ns()}.png"
        image.save(temp_file, format="PNG")

        image_path = self.import_image(name, temp_file)
        try:
            temp_file.unlink(missing_ok=True)
        except Exception:
            pass

        return {"success": True, "image_path": image_path}

    def resolve_workspace_file(self, workspace_name: str, relative_path: str) -> Path:
        workspace_path = self._resolve_workspace_path(workspace_name)
        file_path = self._resolve_relative_path(relative_path, base=workspace_path)
        return file_path

    def _move_candidate(self, workspace_name: str, image_relative_path: str, destination: str) -> dict:
        workspace_path = self._resolve_workspace_path(workspace_name)
        image_path = self._resolve_relative_path(image_relative_path, base=workspace_path)

        if not image_path.exists():
            raise FileNotFoundError("Image not found")

        candidate_folder = image_path.parent
        destination_root = workspace_path / destination
        destination_root.mkdir(parents=True, exist_ok=True)
        destination_path = destination_root / candidate_folder.name

        if destination_path.exists():
            shutil.rmtree(destination_path)

        shutil.move(str(candidate_folder), str(destination_path))
        moved_image = destination_path / image_path.name
        workspace_relative_path = self._workspace_relative_path(workspace_name, moved_image)
        print(f"DEBUG: _move_candidate: workspace_name={workspace_name}, moved_image={moved_image}, workspace_relative_path={workspace_relative_path}")
        return {
            "destination": destination,
            "path": workspace_relative_path,
        }

    def _iter_workspace_dirs(self) -> list[Path]:
        workspace_dirs = []
        for path in self.workspace_root.rglob("*"):
            if not path.is_dir():
                continue
            if path.name in {"commits", "rejects", "candidates", "previews"}:
                continue
            if (path / "commits").is_dir() and (path / "rejects").is_dir():
                workspace_dirs.append(path)
        return workspace_dirs

    def _resolve_workspace_path(self, name: str) -> Path:
        if not name or not isinstance(name, str):
            raise ValueError("Workspace name is required")

        normalized = name.replace("\\", "/").strip("/")
        if not normalized:
            raise ValueError("Workspace name is required")

        parts = Path(normalized).parts
        if any(part in {"..", ".", ""} for part in parts):
            raise ValueError("Invalid workspace name")

        workspace_path = (self.workspace_root / normalized).resolve()
        if self.workspace_root not in workspace_path.parents and workspace_path != self.workspace_root:
            raise ValueError("Invalid workspace path")

        return workspace_path

    def _resolve_relative_path(self, relative_path: str, base: Optional[Path] = None) -> Path:
        if base is None:
            base = self.workspace_root

        normalized = str(relative_path).replace("\\", "/").strip("/")
        if not normalized:
            raise ValueError("Relative path is required")

        parts = Path(normalized).parts
        if any(part in {"..", ".", ""} for part in parts):
            raise ValueError("Invalid relative path")

        resolved_path = (base / normalized).resolve()
        if base not in resolved_path.parents and resolved_path != base:
            raise ValueError("Invalid path")

        return resolved_path

    def _relative_path(self, path: Path) -> str:
        return path.relative_to(self.workspace_root).as_posix()

    def _workspace_relative_path(self, workspace_name: str, path: Path) -> str:
        """Return path relative to workspace, not workspace_root"""
        workspace_path = self._resolve_workspace_path(workspace_name)

        # Ensure both paths are absolute and resolved
        workspace_path = workspace_path.resolve()
        path = path.resolve()

        print(f"DEBUG: _workspace_relative_path: workspace_name={workspace_name}")
        print(f"DEBUG: workspace_path={workspace_path}")
        print(f"DEBUG: path={path}")

        try:
            relative_path = path.relative_to(workspace_path).as_posix()
            print(f"DEBUG: relative_path={relative_path}")
            return relative_path
        except ValueError as e:
            print(f"DEBUG: ValueError: {e}")
            # Try manual calculation
            try:
                workspace_str = str(workspace_path)
                path_str = str(path)
                if path_str.startswith(workspace_str):
                    relative = path_str[len(workspace_str):].lstrip('/').lstrip('\\')
                    print(f"DEBUG: manual relative_path={relative}")
                    return relative.replace('\\', '/')
            except Exception as e2:
                print(f"DEBUG: Manual calculation failed: {e2}")

            # Fallback to relative to workspace_root
            try:
                return path.relative_to(self.workspace_root).as_posix()
            except Exception as e3:
                print(f"DEBUG: Fallback failed: {e3}")
                return str(path)

    def _metadata_path(self, workspace_path: Path) -> Path:
        return workspace_path / "workspace.json"

    def _open_in_file_explorer(self, path: Path) -> None:
        try:
            if os.name == "nt":
                if path.is_file():
                    subprocess.Popen(["explorer", "/select,", str(path)])
                else:
                    os.startfile(str(path))
            elif sys.platform == "darwin":
                if path.is_file():
                    subprocess.Popen(["open", "-R", str(path)])
                else:
                    subprocess.Popen(["open", str(path)])
            else:
                open_path = path if path.is_dir() else path.parent
                subprocess.Popen(["xdg-open", str(open_path)])
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Failed to open path: {error}") from error

    def _load_metadata(self, workspace_path: Path) -> dict:
        metadata_path = self._metadata_path(workspace_path)
        if not metadata_path.exists():
            return {"name": self._relative_path(workspace_path), "created": None, "folders": []}
        try:
            return json.loads(metadata_path.read_text(encoding="utf-8"))
        except Exception:
            return {"name": self._relative_path(workspace_path), "created": None, "folders": []}

    def _save_metadata(self, workspace_path: Path, metadata: dict) -> None:
        metadata_path = self._metadata_path(workspace_path)
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    def _prompt_file_path(self, workspace_path: Path) -> Path:
        return workspace_path / "prompt.json"

    def reveal_workspace_path(self, name: str, payload: dict) -> dict:
        if not isinstance(payload, dict):
            raise HTTPException(status_code=422, detail="Payload is required")
        relative_path = payload.get("path")
        if not relative_path:
            raise HTTPException(status_code=422, detail="path is required")

        file_path = self.resolve_workspace_file(name, relative_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {relative_path}")

        self._open_in_file_explorer(file_path)
        return {"success": True, "path": self._workspace_relative_path(name, file_path)}

    def open_workspace_image_in_mspaint(self, name: str, payload: dict) -> dict:
        if sys.platform != "win32":
            raise HTTPException(status_code=422, detail="MS Paint integration is only supported on Windows")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=422, detail="Payload is required")
        relative_path = payload.get("path")
        if not relative_path:
            raise HTTPException(status_code=422, detail="path is required")

        file_path = self.resolve_workspace_file(name, relative_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {relative_path}")

        mspaint = shutil.which("mspaint")
        if not mspaint:
            raise HTTPException(status_code=500, detail="MS Paint executable not found")

        try:
            subprocess.Popen([mspaint, str(file_path)])
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Failed to launch MS Paint: {error}") from error

        return {"success": True, "path": self._workspace_relative_path(name, file_path)}

    def register_routes(self, api):
        """Register workspace API routes with the given API instance"""
        # Workspace routes
        api.add_api_route("/workspaces", self.list_workspaces, methods=["GET"])
        api.add_api_route("/workspaces", self.create_workspace, methods=["POST"])
        api.add_api_route("/workspaces/structure", self.get_workspace_structure, methods=["GET"])
        api.add_api_route("/workspaces/folders", self.create_workspace_folder, methods=["POST"])
        api.add_api_route("/workspaces/move", self.move_workspace_item, methods=["POST"])
        api.add_api_route("/workspaces/rename", self.rename_workspace_item, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/prompt", self.get_workspace_prompt, methods=["GET"])
        api.add_api_route("/workspaces/{name:path}/prompt", self.save_workspace_prompt, methods=["POST"])

        # Unified asset endpoint: /workspaces/{name}/{category}/{genid}/{asset}
        api.add_api_route("/workspaces/{name:path}/{category}/{genid}/{asset}", self.image_server.serve_generation_asset, methods=["GET"])

        # Generations endpoint: /workspaces/{name}/generations
        api.add_api_route("/workspaces/{name:path}/generations", self.list_generations, methods=["GET"])

        # Action routes
        api.add_api_route("/workspaces/{name:path}/commit", self.commit_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/reject", self.reject_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/delete", self.delete_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/restore", self.restore_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/uncommit", self.uncommit_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/import", self.import_workspace_image, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/reveal", self.reveal_workspace_path, methods=["POST"])
        api.add_api_route("/workspaces/{name:path}/open-mspaint", self.open_workspace_image_in_mspaint, methods=["POST"])


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

    def save_image_with_preview_and_meta(self, image_path: Path, output_dir: Path, max_size: Optional[int] = None) -> dict:
        """Save an image with preview and metadata files in the new format.

        Creates:
        - full.png: The original full-size image
        - {width}|{height}.png: Preview image resized to max_size
        - meta.json: Metadata including dimensions

        Returns dict with paths and metadata.
        """
        max_size = max_size or self.preview_max_size
        output_dir.mkdir(parents=True, exist_ok=True)

        # Load the original image to get dimensions
        with Image.open(image_path) as image:
            width, height = image.size

            # Save full image
            full_path = output_dir / "full.png"
            image.save(full_path, format="PNG")

            # Save preview image as 512.png
            preview_image = self.resize_for_preview(image_path, max_size=max_size)
            preview_width, preview_height = preview_image.size
            preview_path = output_dir / "512.png"
            preview_image.save(preview_path, format="PNG")

            # Create metadata
            metadata = {
                "full_width": width,
                "full_height": height,
                "preview_width": preview_width,
                "preview_height": preview_height,
                "preview_max_size": max_size,
            }

            # Save metadata
            meta_path = output_dir / "meta.json"
            meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

            return {
                "full_path": full_path,
                "preview_path": preview_path,
                "meta_path": meta_path,
                "metadata": metadata,
            }

