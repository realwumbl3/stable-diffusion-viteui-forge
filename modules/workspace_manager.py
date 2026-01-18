import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional


class WorkspaceManager:
    def __init__(self, workspace_root: str = "workspaces"):
        self.workspace_root = Path(workspace_root).resolve()
        self.workspace_root.mkdir(parents=True, exist_ok=True)

    def list_workspaces(self) -> list[dict]:
        workspaces = []
        for workspace_dir in self._iter_workspace_dirs():
            metadata = self._load_metadata(workspace_dir)
            workspaces.append({
                "name": self._relative_path(workspace_dir),
                "created": metadata.get("created"),
                "folders": metadata.get("folders", []),
            })
        return workspaces

    def create_workspace(self, name: str) -> dict:
        workspace_path = self._resolve_workspace_path(name)
        if workspace_path.exists():
            return {"created": False, "name": self._relative_path(workspace_path)}

        workspace_path.mkdir(parents=True, exist_ok=False)
        (workspace_path / "commits").mkdir()
        (workspace_path / "rejects").mkdir()
        (workspace_path / "candidates").mkdir()
        (workspace_path / "previews").mkdir()

        metadata = {
            "name": self._relative_path(workspace_path),
            "created": datetime.now().isoformat(),
            "folders": [],
        }
        self._save_metadata(workspace_path, metadata)
        return {"created": True, "name": metadata["name"]}

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

    def get_workspace_structure(self) -> dict:
        def build_tree(path: Path) -> dict:
            children = []
            for child in sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
                if child.is_dir():
                    # Skip internal folders that should not be treated as workspaces
                    if child.name in {"commits", "rejects", "candidates", "previews"}:
                        continue
                    children.append(build_tree(child))
            is_workspace = (path / "commits").is_dir() and (path / "rejects").is_dir()
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

        return build_tree(self.workspace_root)

    def save_generation_images(self, workspace_name: str, images: list, mask_image: Optional[object] = None) -> list[str]:
        workspace_path = self._resolve_workspace_path(workspace_name)
        candidates_root = workspace_path / "candidates"
        candidates_root.mkdir(parents=True, exist_ok=True)

        saved_paths = []
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        unique_seed = datetime.now().microsecond
        for idx, image in enumerate(images, start=1):
            candidate_id = f"{timestamp}_{unique_seed:06d}_{idx:03d}"
            candidate_path = candidates_root / candidate_id
            candidate_path.mkdir(parents=True, exist_ok=False)

            image_path = candidate_path / "image.png"
            image.save(image_path, format="PNG")

            if mask_image is not None:
                mask_path = candidate_path / "mask.png"
                mask_image.save(mask_path, format="PNG")

            saved_paths.append(self._workspace_relative_path(workspace_name, image_path))

        return saved_paths

    def commit_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="commits")

    def reject_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="rejects")

    def restore_candidate(self, workspace_name: str, image_relative_path: str) -> dict:
        return self._move_candidate(workspace_name, image_relative_path, destination="candidates")

    def import_image(self, workspace_name: str, image_path: Path, mask_path: Optional[Path] = None) -> str:
        workspace_path = self._resolve_workspace_path(workspace_name)
        candidates_root = workspace_path / "candidates"
        candidates_root.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        candidate_id = f"{timestamp}_{datetime.now().microsecond:06d}"
        candidate_path = candidates_root / candidate_id
        candidate_path.mkdir(parents=True, exist_ok=False)

        shutil.copy2(image_path, candidate_path / "image.png")
        if mask_path and mask_path.exists():
            shutil.copy2(mask_path, candidate_path / "mask.png")

        return self._workspace_relative_path(workspace_name, candidate_path / "image.png")

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
