import os
import json
import threading
import time
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException
from PIL import Image
import numpy as np
import imageio.v3 as iio

class TimelapseCreator:
    def __init__(self, api):
        self.api = api
        self.jobs = {} # job_id -> status_dict
        self.register_routes(api)

    def register_routes(self, api):
        api.add_api_route("/viteapi/timelapse/start", self.start_timelapse, methods=["POST"])
        api.add_api_route("/viteapi/timelapse/status/{job_id}", self.get_status, methods=["GET"])

    async def get_status(self, job_id: str):
        if job_id not in self.jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        return self.jobs[job_id]

    async def start_timelapse(self, request: Request):
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON request")

        workspace_name = payload.get("workspace")
        if not workspace_name:
            raise HTTPException(status_code=422, detail="workspace is required")

        commit_range = payload.get("range") # e.g. "0..10" or "genid1..genid2"

        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "id": job_id,
            "status": "pending",
            "workspace": workspace_name,
            "progress": 0,
            "message": "Initializing...",
            "created_at": datetime.now().isoformat()
        }

        # Start background thread
        thread = threading.Thread(
            target=self._create_timelapse_worker,
            args=(job_id, workspace_name, commit_range),
            daemon=True
        )
        thread.start()

        return {"job_id": job_id, "status": "started"}

    def _create_timelapse_worker(self, job_id: str, workspace_name: str, commit_range: Optional[str]):
        try:
            self.jobs[job_id]["status"] = "in_progress"
            # Get workspace manager - we can access it via api.viteapi.workspace_manager
            # but let's be safe and check where it is
            workspace_manager = getattr(self.api, 'workspace_manager', None)
            if not workspace_manager and hasattr(self.api, 'viteapi'):
                workspace_manager = getattr(self.api.viteapi, 'workspace_manager', None)
            
            if not workspace_manager:
                raise Exception("Workspace manager not found")

            workspace_path = workspace_manager._resolve_workspace_path(workspace_name)
            commits_path = workspace_path / "commits"

            if not commits_path.exists():
                raise Exception(f"Commits folder not found in workspace {workspace_name}")

            # Collect all commits with metadata
            all_commits = []
            for genid_dir in commits_path.iterdir():
                if not genid_dir.is_dir():
                    continue
                
                meta_path = genid_dir / "meta.json"
                image_path = genid_dir / "full.webp"
                
                if not meta_path.exists() or not image_path.exists():
                    continue

                try:
                    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
                    timestamp = metadata.get("timestamp", 0)
                    all_commits.append({
                        "genid": genid_dir.name,
                        "timestamp": timestamp,
                        "image_path": image_path
                    })
                except Exception:
                    continue

            if not all_commits:
                raise Exception("No commits found in workspace")

            # Sort chronologically (oldest first)
            all_commits.sort(key=lambda x: x["timestamp"])

            # Handle range
            selected_commits = all_commits
            if commit_range:
                selected_commits = self._apply_range(all_commits, commit_range)

            if not selected_commits:
                raise Exception("No commits match the specified range")

            self.jobs[job_id]["total_frames"] = len(selected_commits)
            self.jobs[job_id]["message"] = f"Processing {len(selected_commits)} frames..."

            # Create output directory
            output_dir = workspace_path / "timelapse"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"timelapse_{timestamp_str}.mp4"
            output_path = output_dir / output_filename

            # Create video
            # 1 second per commit -> fps = 1
            fps = 1
            
            self.jobs[job_id]["message"] = "Starting video encoding..."
            
            # Use imageio with ffmpeg to write video frame by frame to save memory
            with iio.imopen(output_path, "w", plugin="ffmpeg") as writer:
                base_size = None
                for i, commit in enumerate(selected_commits):
                    try:
                        with Image.open(commit["image_path"]) as img:
                            if base_size is None:
                                base_size = img.size
                                # For ffmpeg, dimensions must be even
                                if base_size[0] % 2 != 0 or base_size[1] % 2 != 0:
                                    base_size = (base_size[0] // 2 * 2, base_size[1] // 2 * 2)
                                
                            # Always convert and resize to base_size to ensure consistency
                            if img.size != base_size:
                                img = img.resize(base_size, Image.Resampling.LANCZOS)
                            
                            frame = np.array(img.convert("RGB"))
                            writer.write(frame, fps=fps, codec="libx264")
                            
                        self.jobs[job_id]["progress"] = int((i + 1) / len(selected_commits) * 100)
                        if i % 10 == 0:
                            self.jobs[job_id]["message"] = f"Processed {i+1}/{len(selected_commits)} frames..."
                    except Exception as e:
                        print(f"Error processing frame {i} ({commit['image_path']}): {e}")
                        continue

            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["output_path"] = str(output_path)
            self.jobs[job_id]["message"] = f"Timelapse created: {output_filename}"

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            self.jobs[job_id]["message"] = f"Error: {str(e)}"

    def _apply_range(self, commits: List[Dict], commit_range: str) -> List[Dict]:
        """Apply range like '0..10' (indices) or 'genid1..genid2' (inclusive)"""
        if ".." not in commit_range:
            return commits

        start_str, end_str = commit_range.split("..", 1)
        
        # Try as indices first
        try:
            start_idx = int(start_str) if start_str else 0
            end_idx = int(end_str) if end_str else len(commits)
            return commits[start_idx:end_idx]
        except ValueError:
            # Try as genids
            start_idx = 0
            end_idx = len(commits)
            
            if start_str:
                for i, c in enumerate(commits):
                    if c["genid"] == start_str:
                        start_idx = i
                        break
            
            if end_str:
                for i, c in enumerate(commits):
                    if c["genid"] == end_str:
                        end_idx = i + 1
                        break
            
            return commits[start_idx:end_idx]
