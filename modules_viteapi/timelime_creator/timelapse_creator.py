import os
import json
import threading
import time
import uuid
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2

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
        fps = payload.get("fps", 1)
        max_side = payload.get("max_side", 0)
        width = payload.get("width", 0)
        height = payload.get("height", 0)
        last_frame_duration = payload.get("last_frame_duration", 0)
        show_timestamp = payload.get("show_timestamp", False)

        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "id": job_id,
            "status": "pending",
            "workspace": workspace_name,
            "fps": fps,
            "max_side": max_side,
            "width": width,
            "height": height,
            "last_frame_duration": last_frame_duration,
            "show_timestamp": show_timestamp,
            "progress": 0,
            "message": "Initializing...",
            "created_at": datetime.now().isoformat()
        }

        # Start background thread
        thread = threading.Thread(
            target=self._create_timelapse_worker,
            args=(job_id, workspace_name, commit_range, fps, max_side, last_frame_duration, width, height, show_timestamp),
            daemon=True
        )
        thread.start()

        return {"job_id": job_id, "status": "started"}

    def _create_timelapse_worker(self, job_id: str, workspace_name: str, commit_range: Optional[str], fps: float = 1, max_side: int = 0, last_frame_duration: float = 0, width: int = 0, height: int = 0, show_timestamp: bool = False):
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

            self.jobs[job_id]["message"] = "Starting video encoding..."
            
            # Determine base resolution
            target_width = width
            target_height = height
            
            if target_width <= 0 or target_height <= 0:
                # Use the resolution of the LAST frame as the base, as it's usually the final desired one
                last_commit = selected_commits[-1]
                with Image.open(last_commit["image_path"]) as img:
                    target_width, target_height = img.size
            
            # Apply max_side constraint
            if max_side > 0:
                long_side = max(target_width, target_height)
                if long_side > max_side:
                    scale = max_side / long_side
                    target_width = int(target_width * scale)
                    target_height = int(target_height * scale)
            
            # Dimensions must be even for many codecs
            target_width = target_width // 2 * 2
            target_height = target_height // 2 * 2
            base_size = (target_width, target_height)
            
            # Prepare font if needed
            font = None
            if show_timestamp:
                try:
                    font_path = Path("modules/Roboto-Regular.ttf")
                    if font_path.exists():
                        font_size = max(16, int(target_height * 0.03))
                        font = ImageFont.truetype(str(font_path), font_size)
                    else:
                        font = ImageFont.load_default()
                except Exception:
                    font = ImageFont.load_default()

            # Prepare ffmpeg command for maximum compatibility
            # - libx264: H.264 codec
            # - pix_fmt yuv420p: Essential for web/mobile playback
            # - movflags +faststart: Allows video to play while downloading
            cmd = [
                'ffmpeg',
                '-y',
                '-f', 'rawvideo',
                '-vcodec', 'rawvideo',
                '-s', f'{target_width}x{target_height}',
                '-pix_fmt', 'bgr24',
                '-r', str(fps),
                '-i', '-',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-preset', 'medium',
                '-crf', '23',
                '-movflags', '+faststart',
                str(output_path)
            ]
            
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
            
            try:
                last_frame_bytes = None
                for i, commit in enumerate(selected_commits):
                    try:
                        with Image.open(commit["image_path"]) as img:
                            # Always convert and resize to base_size to ensure consistency
                            if img.size != base_size:
                                img = img.resize(base_size, Image.Resampling.LANCZOS)
                            
                            # Draw timestamp if requested
                            if show_timestamp and font:
                                # Convert milliseconds to seconds
                                dt = datetime.fromtimestamp(commit["timestamp"] / 1000.0)
                                time_text = dt.strftime("%m/%d %I:%M %p")
                                
                                draw = ImageDraw.Draw(img)
                                
                                # Use textbbox for newer Pillow versions
                                if hasattr(draw, 'textbbox'):
                                    bbox = draw.textbbox((0, 0), time_text, font=font)
                                    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
                                else:
                                    tw, th = draw.textsize(time_text, font=font)
                                
                                padding = 10
                                tx = (target_width - tw) // 2
                                ty = target_height - th - padding - 20
                                
                                # Draw background for readability
                                bg_rect = [tx - padding, ty - padding, tx + tw + padding, ty + th + padding]
                                draw.rectangle(bg_rect, fill=(0, 0, 0, 128))
                                draw.text((tx, ty), time_text, font=font, fill=(255, 255, 255, 255))

                            # OpenCV uses BGR, and ffmpeg expects BGR24 as specified in cmd
                            frame = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
                            frame_bytes = frame.tobytes()
                            process.stdin.write(frame_bytes)
                            last_frame_bytes = frame_bytes
                            
                        self.jobs[job_id]["progress"] = int((i + 1) / len(selected_commits) * 100)
                        if i % 10 == 0:
                            self.jobs[job_id]["message"] = f"Processed {i+1}/{len(selected_commits)} frames..."
                    except Exception as e:
                        print(f"Error processing frame {i} ({commit['image_path']}): {e}")
                        continue

                # Add extra frames for the last frame duration
                if last_frame_bytes is not None and last_frame_duration > 0:
                    extra_frames = int(last_frame_duration * fps)
                    if extra_frames > 0:
                        self.jobs[job_id]["message"] = f"Adding last frame duration ({last_frame_duration}s)..."
                        for _ in range(extra_frames):
                            process.stdin.write(last_frame_bytes)
            finally:
                if process.stdin:
                    process.stdin.close()
                stdout, stderr = process.communicate()
                if process.returncode != 0:
                    print(f"FFMPEG Error: {stderr.decode()}")
                    raise Exception(f"FFMPEG failed with exit code {process.returncode}")

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
