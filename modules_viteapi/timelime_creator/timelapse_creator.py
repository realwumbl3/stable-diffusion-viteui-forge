import json
import threading
import uuid
import subprocess
import os
import queue
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import Request, HTTPException
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
import asyncio
import argparse
import base64
import io

# Global configuration for optimization
OPTIMIZATION_HIGH_CORES = os.cpu_count() or 4
OPTIMIZATION_LOW_CORES = max(1, (os.cpu_count() or 4) // 2)

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

    async def start_timelapse(self, request: Request = None, **kwargs):
        if request:
            try:
                payload = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON request")
        else:
            payload = kwargs

        workspace_name = payload.get("workspace")
        if not workspace_name:
            if request:
                raise HTTPException(status_code=422, detail="workspace is required")
            else:
                raise ValueError("workspace is required")

        commit_range = payload.get("range") # e.g. "0..10" or "genid1..genid2"
        fps = float(payload.get("fps", 1))
        max_side = int(payload.get("max_side", 0))
        width = int(payload.get("width", 0))
        height = int(payload.get("height", 0))
        last_frame_duration = float(payload.get("last_frame_duration", 0))
        frame_duration = float(payload.get("frame_duration", 0)) # Duration for each commit in ms
        translate_speed = float(payload.get("translate_speed", 1.0)) # Speed multiplier for transitions
        zoom_padding = int(payload.get("zoom_padding", 32)) # Pixels of padding around the patch
        quality = payload.get("quality", "medium") # low, medium, high, ultra
        show_mask = bool(payload.get("show_mask", False))
        show_source = bool(payload.get("show_source", False))
        source_mask = payload.get("source_mask", "mask") # mask or diffMask
        mask_duration = float(payload.get("mask_duration", 0)) # ms to show mask
        show_timestamp = bool(payload.get("show_timestamp", False))
        zoom_into_partials = bool(payload.get("zoom_into_partials", False))
        optimization = payload.get("optimization", "high") # high, low

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
            "frame_duration": frame_duration,
            "translate_speed": translate_speed,
            "zoom_padding": zoom_padding,
            "quality": quality,
            "show_mask": show_mask,
            "show_source": show_source,
            "source_mask": source_mask,
            "mask_duration": mask_duration,
            "show_timestamp": show_timestamp,
            "zoom_into_partials": zoom_into_partials,
            "optimization": optimization,
            "progress": 0,
            "message": "Initializing...",
            "created_at": datetime.now().isoformat()
        }

        print(f"Starting timelapse for workspace: {workspace_name} with args: {payload}")

        # Start background thread
        thread = threading.Thread(
            target=self._create_timelapse_worker,
            args=(job_id, workspace_name, commit_range, fps, max_side, last_frame_duration, width, height, show_timestamp, zoom_into_partials, frame_duration, translate_speed, zoom_padding, quality, show_mask, mask_duration, optimization, source_mask, show_source),
            daemon=True
        )
        thread.start()

        return {"job_id": job_id, "status": "started"}

    def _create_timelapse_worker(self, job_id: str, workspace_name: str, commit_range: Optional[str], fps: float = 1, max_side: int = 0, last_frame_duration: float = 0, width: int = 0, height: int = 0, show_timestamp: bool = False, zoom_into_partials: bool = False, frame_duration: float = 0, translate_speed: float = 1.0, zoom_padding: int = 32, quality: str = "medium", show_mask: bool = False, mask_duration: float = 0, optimization: str = "high", source_mask: str = "mask", show_source: bool = False):
        try:
            self.jobs[job_id]["status"] = "in_progress"
            
            # Configure parallelization parameters
            if optimization == "high":
                num_workers = OPTIMIZATION_HIGH_CORES
                preload_workers = 4
                buffer_size = 32
            else:
                num_workers = OPTIMIZATION_LOW_CORES
                preload_workers = 2
                buffer_size = 16

            # Get workspace manager
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
                    partial_info = metadata.get("partial_candidates_info")
                    
                    # If not in main meta, check nested partial_candidate/meta.json
                    if not partial_info:
                        nested_meta_path = genid_dir / "partial_candidate" / "meta.json"
                        if nested_meta_path.exists():
                            try:
                                nested_metadata = json.loads(nested_meta_path.read_text(encoding="utf-8"))
                                partial_info = nested_metadata.get("partial_candidates_info")
                            except Exception:
                                pass

                    all_commits.append({
                        "genid": genid_dir.name,
                        "timestamp": timestamp,
                        "image_path": image_path,
                        "partial_info": partial_info,
                        "source": metadata.get("source")
                    })
                except Exception:
                    continue

            if not all_commits:
                raise Exception("No commits found in workspace")

            # Sort by GEN ID (folder name) to ensure correct order
            all_commits.sort(key=lambda x: x["genid"])

            # Handle range
            selected_commits = all_commits
            if commit_range:
                selected_commits = self._apply_range(all_commits, commit_range)

            if not selected_commits:
                raise Exception("No commits match the specified range")

            self.jobs[job_id]["total_frames"] = len(selected_commits)
            self.jobs[job_id]["message"] = f"Processing {len(selected_commits)} commits (optimization: {optimization})..."

            # Create output directory
            output_dir = workspace_path / "timelapse"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"timelapse_{timestamp_str}.mp4"
            output_path = output_dir / output_filename

            # Determine base resolution
            target_width = width
            target_height = height
            
            if target_width <= 0 or target_height <= 0:
                last_commit = selected_commits[-1]
                with Image.open(last_commit["image_path"]) as img:
                    target_width, target_height = img.size
            
            if max_side > 0:
                long_side = max(target_width, target_height)
                if long_side > max_side:
                    scale = max_side / long_side
                    target_width = int(target_width * scale)
                    target_height = int(target_height * scale)
            
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
            
            # Prepare ffmpeg command
            # - hevc_nvenc: NVIDIA Hardware HEVC encoder (lightning fast)
            # - pix_fmt yuv420p: Essential for web/mobile playback
            # - tag:v hvc1: Critical for QuickTime/macOS/iOS compatibility
            # - cq: Constant Quality (similar to CRF)
            
            # Using hardware encoding (NVENC) if available, falling back to libx265 with faster presets
            has_nvenc = True # We'll assume True and fallback in logic if needed, or just use fast software presets
            
            quality_map = {
                "low": {"crf": "32", "cq": "32", "preset": "fast"},
                "medium": {"crf": "28", "cq": "28", "preset": "p4"}, # p4 is medium speed for NVENC
                "high": {"crf": "24", "cq": "24", "preset": "p6"},   # p6 is slower/better for NVENC
                "ultra": {"crf": "18", "cq": "18", "preset": "p7"}   # p7 is slowest/best for NVENC
            }
            q_settings = quality_map.get(quality.lower(), quality_map["medium"])

            # Detect if we should use NVENC or Software
            # For this environment, we'll try NVENC first
            vcodec = "hevc_nvenc"
            
            cmd = [
                'ffmpeg', '-y',
                '-f', 'rawvideo',
                '-vcodec', 'rawvideo',
                '-s', f'{target_width}x{target_height}',
                '-pix_fmt', 'bgr24',
                '-r', str(fps),
                '-i', '-',
                '-c:v', vcodec,
                '-pix_fmt', 'yuv420p',
                '-tag:v', 'hvc1',
                '-preset', q_settings["preset"],
                '-rc', 'vbr',        # Variable bit rate
                '-cq', q_settings["cq"],
                '-movflags', '+faststart',
                '-threads', '0',
                str(output_path)
            ]
            
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Frame writing queue and thread
            frame_queue = queue.Queue(maxsize=buffer_size)
            writer_error = [None]

            def writer_thread_func():
                try:
                    while True:
                        item = frame_queue.get()
                        if item is None: # EOF signal
                            break
                        process.stdin.write(item)
                        frame_queue.task_done()
                except Exception as e:
                    writer_error[0] = e
                    # Exhaust queue to avoid blocking main thread
                    try:
                        while not frame_queue.empty():
                            frame_queue.get_nowait()
                            frame_queue.task_done()
                    except: pass

            writer_thread = threading.Thread(target=writer_thread_func, daemon=True)
            writer_thread.start()

            try:
                target_aspect = target_width / target_height
                current_zoom_rect = (0.0, 0.0, 1.0, 1.0) # (x, y, w, h) normalized
                frames_per_commit = int(max(1, (frame_duration / 1000.0) * fps)) if frame_duration > 0 else 1
                crossfade_frames = int(max(1, fps // 2))
                mask_frames = int(max(1, (mask_duration / 1000.0) * fps)) if mask_duration > 0 else 0
                
                # Preloader and Generator pools
                with ThreadPoolExecutor(max_workers=preload_workers) as preload_pool, \
                     ThreadPoolExecutor(max_workers=num_workers) as gen_pool:
                    
                    # Function to load and prepare an image (RGB + BGR upfront)
                    def load_image(commit_item):
                        with Image.open(commit_item["image_path"]) as img:
                            img = img.convert("RGB")
                            return {
                                "genid": commit_item["genid"],
                                "img": img,
                                "timestamp": commit_item["timestamp"],
                                "partial_info": commit_item["partial_info"],
                                "source": commit_item.get("source")
                            }

                    # Preload first image
                    current_image_data = load_image(selected_commits[0])
                    
                    for i, commit in enumerate(selected_commits):
                        if writer_error[0]: raise writer_error[0]
                        
                        self.jobs[job_id]["progress"] = int((i) / len(selected_commits) * 100)
                        self.jobs[job_id]["message"] = f"Processing commit {i+1}/{len(selected_commits)}..."
                        
                        img = current_image_data["img"]
                        img_full_rect = (0.0, 0.0, 1.0, 1.0)
                        
                        # Prepare for next iteration's image
                        next_commit = selected_commits[i+1] if i + 1 < len(selected_commits) else None
                        next_image_future = preload_pool.submit(load_image, next_commit) if next_commit else None

                        # First commit static frames
                        if i == 0 and current_zoom_rect == (0.0, 0.0, 1.0, 1.0):
                            frame_bytes = self._prepare_frame(img, current_image_data, base_size, show_timestamp, font, show_source)
                            for _ in range(frames_per_commit):
                                frame_queue.put(frame_bytes)

                        if not next_commit:
                            # Final zoom out
                            if current_zoom_rect != (0.0, 0.0, 1.0, 1.0):
                                zoom_frames = int(max(1, (fps / translate_speed)))
                                self.jobs[job_id]["message"] = "Final zoom out..."
                                
                                def gen_zoom_out_frame(f):
                                    t = (f + 1) / zoom_frames
                                    t_smooth = t * t * (3 - 2 * t)
                                    curr_rect = [s + (e - s) * t_smooth for s, e in zip(current_zoom_rect, img_full_rect)]
                                    zoomed_img = self._crop_normalized(img, curr_rect)
                                    return self._prepare_frame(zoomed_img, current_image_data, base_size, show_timestamp, font, show_source)

                                for frame in gen_pool.map(gen_zoom_out_frame, range(zoom_frames)):
                                    frame_queue.put(frame)

                                current_zoom_rect = (0.0, 0.0, 1.0, 1.0)
                                last_frame_bytes = self._prepare_frame(img, current_image_data, base_size, show_timestamp, font, show_source)
                                frame_queue.put(last_frame_bytes)
                            else:
                                last_frame_bytes = self._prepare_frame(img, current_image_data, base_size, show_timestamp, font, show_source)
                            break

                        next_image_data = next_image_future.result()
                        next_img = next_image_data["img"]
                        
                        is_partial_zoom = False
                        if zoom_into_partials:
                            next_source = next_image_data.get("source")
                            next_partial_info = next_image_data.get("partial_info")
                            if next_partial_info and len(next_partial_info) > 0:
                                info = next_partial_info[0]
                                paste_to = info.get("paste_to")
                                has_mask = bool(info.get("mask") or info.get("diffMask"))

                                if paste_to:
                                    is_partial_zoom = True
                                    
                                    # If it's a full-frame generation mode, we don't zoom in (stay at 0,0,1,1)
                                    if next_source in ["txt2img", "img2img"]:
                                        target_rect = (0.0, 0.0, 1.0, 1.0)
                                    else:
                                        target_rect = self._get_zoom_rect(next_img.size, paste_to, target_aspect, zoom_padding)
                                    
                                    start_rect = current_zoom_rect
                                    
                                    # Transition zoom
                                    if start_rect != target_rect:
                                        zoom_frames = int(max(1, (fps / translate_speed)))
                                        self.jobs[job_id]["message"] = f"Transitioning zoom to partial {i+2}..."
                                        
                                        def gen_zoom_transition_frame(f):
                                            t = (f + 1) / zoom_frames
                                            t_smooth = t * t * (3 - 2 * t)
                                            curr_rect = [s + (e - s) * t_smooth for s, e in zip(start_rect, target_rect)]
                                            zoomed_img = self._crop_normalized(img, curr_rect)
                                            return self._prepare_frame(zoomed_img, current_image_data, base_size, show_timestamp, font, show_source)

                                        for frame in gen_pool.map(gen_zoom_transition_frame, range(zoom_frames)):
                                            frame_queue.put(frame)

                                    # Optional: Show Mask
                                    if show_mask and mask_frames > 0 and has_mask:
                                        # Pick mask based on source_mask preference with fallbacks
                                        mask_data = None
                                        if source_mask == "diffMask":
                                            mask_data = info.get("diffMask") or info.get("mask")
                                        else:
                                            mask_data = info.get("mask") or info.get("diffMask")

                                        if mask_data and isinstance(mask_data, str) and len(mask_data) > 10:
                                            mask_img = self._decode_base64_to_image(mask_data)
                                            if mask_img:
                                                self.jobs[job_id]["message"] = f"Showing mask for commit {i+2}..."
                                                mask_img = mask_img.convert("L")
                                                
                                                # Important: Use target_rect on BOTH images to ensure alignment
                                                zoomed_img_start = self._crop_normalized(img, target_rect)
                                                
                                                # Handle mask sizing (it might be patch-sized or full-sized)
                                                if mask_img.size == next_img.size:
                                                    zoomed_mask = self._crop_normalized(mask_img, target_rect)
                                                else:
                                                    # Reconstruct full-sized mask relative to next_img size
                                                    full_mask = Image.new("L", next_img.size, 0)
                                                    px, py, pw, ph = paste_to
                                                    # Resize patch-mask to intended paste size if they differ
                                                    if mask_img.size != (int(pw), int(ph)):
                                                        mask_img = mask_img.resize((int(pw), int(ph)), Image.Resampling.LANCZOS)
                                                    full_mask.paste(mask_img, (int(px), int(py)))
                                                    zoomed_mask = self._crop_normalized(full_mask, target_rect)
                                                
                                                # Prepare base frame from current image
                                                zoomed_img_start_base = zoomed_img_start.resize(base_size, Image.Resampling.LANCZOS)
                                                zoomed_mask_base = zoomed_mask.resize(base_size, Image.Resampling.LANCZOS)
                                                
                                                overlay = Image.new("RGB", base_size, (255, 0, 255))
                                                highlighted = Image.composite(overlay, zoomed_img_start_base, zoomed_mask_base)
                                                
                                                # Dimmer masks for txt2img/img2img (10% vs 70%)
                                                blend_factor = 0.3 if next_source in ["txt2img", "img2img"] else 0.7
                                                highlighted = Image.blend(zoomed_img_start_base, highlighted, blend_factor)
                                                
                                                mask_frame_bytes = self._prepare_frame(highlighted, next_image_data, base_size, show_timestamp, font, show_source)
                                                for _ in range(mask_frames):
                                                    frame_queue.put(mask_frame_bytes)

                                        # Crossfade (zoomed)
                                        # To handle resolution changes, we resize BOTH to base_size before blending
                                        zoomed_img_start = self._crop_normalized(img, target_rect).resize(base_size, Image.Resampling.LANCZOS)
                                        zoomed_img_end = self._crop_normalized(next_img, target_rect).resize(base_size, Image.Resampling.LANCZOS)
                                            
                                        def gen_zoomed_crossfade_frame(f):
                                            alpha = (f + 1) / crossfade_frames
                                            blended = Image.blend(zoomed_img_start, zoomed_img_end, alpha)
                                            return self._prepare_frame(blended, next_image_data, base_size, show_timestamp, font, show_source)

                                        for frame in gen_pool.map(gen_zoomed_crossfade_frame, range(crossfade_frames)):
                                            frame_queue.put(frame)

                                    current_zoom_rect = target_rect

                        if not is_partial_zoom:
                            # Zoom out if needed
                            if current_zoom_rect != (0.0, 0.0, 1.0, 1.0):
                                zoom_frames = int(max(1, (fps / translate_speed)))
                                self.jobs[job_id]["message"] = "Zooming out..."
                                def gen_zoom_out_frame_std(f):
                                    t = (f + 1) / zoom_frames
                                    t_smooth = t * t * (3 - 2 * t)
                                    curr_rect = [s + (e - s) * t_smooth for s, e in zip(current_zoom_rect, img_full_rect)]
                                    zoomed_img = self._crop_normalized(img, curr_rect)
                                    return self._prepare_frame(zoomed_img, current_image_data, base_size, show_timestamp, font, show_source)
                                
                                for frame in gen_pool.map(gen_zoom_out_frame_std, range(zoom_frames)):
                                    frame_queue.put(frame)
                                current_zoom_rect = (0.0, 0.0, 1.0, 1.0)

                            # Crossfade (full frame)
                            self.jobs[job_id]["message"] = f"Crossfading to commit {i+2}..."
                            
                            # To handle resolution changes smoothly, resize both to base_size first
                            img_ready = img.resize(base_size, Image.Resampling.LANCZOS)
                            next_img_ready = next_img.resize(base_size, Image.Resampling.LANCZOS)
                            
                            def gen_crossfade_frame(f):
                                alpha = (f + 1) / crossfade_frames
                                blended = Image.blend(img_ready, next_img_ready, alpha)
                                return self._prepare_frame(blended, next_image_data, base_size, show_timestamp, font, show_source)

                            for frame in gen_pool.map(gen_crossfade_frame, range(crossfade_frames)):
                                frame_queue.put(frame)

                        # Show next commit static
                        static_img = self._crop_normalized(next_img, current_zoom_rect)
                        
                        frame_bytes = self._prepare_frame(static_img, next_image_data, base_size, show_timestamp, font, show_source)
                        for _ in range(frames_per_commit):
                            frame_queue.put(frame_bytes)
                        last_frame_bytes = frame_bytes
                        current_image_data = next_image_data

                # Add extra frames for the last frame duration
                if last_frame_bytes is not None and last_frame_duration > 0:
                    extra_frames = int(last_frame_duration * fps)
                    if extra_frames > 0:
                        self.jobs[job_id]["message"] = f"Adding last frame duration ({last_frame_duration}s)..."
                        for _ in range(extra_frames):
                            frame_queue.put(last_frame_bytes)
                
                # Signal writer thread to finish
                frame_queue.put(None)
                writer_thread.join()

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

    def _prepare_frame(self, img, commit_data, base_size, show_timestamp, font, show_source=False):
        """Resizes, draws timestamp/source, and converts to BGR bytes for ffmpeg"""
        target_width, target_height = base_size
        
        # Always resize to base_size to ensure consistency
        if img.size != base_size:
            img = img.resize(base_size, Image.Resampling.LANCZOS)
        
        # Draw timestamp and/or source if requested
        if (show_timestamp or show_source) and font:
            draw = ImageDraw.Draw(img)
            padding = 10
            
            # Prepare texts
            texts = []
            if show_timestamp:
                dt = datetime.fromtimestamp(commit_data["timestamp"] / 1000.0)
                texts.append(dt.strftime("%m/%d %I:%M %p"))
            if show_source and commit_data.get("source"):
                texts.append(str(commit_data["source"]).upper())
            
            if texts:
                full_text = " | ".join(texts)
                
                # Use textbbox for newer Pillow versions
                if hasattr(draw, 'textbbox'):
                    bbox = draw.textbbox((0, 0), full_text, font=font)
                    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
                else:
                    tw, th = draw.textsize(full_text, font=font)
                
                tx = (target_width - tw) // 2
                ty = target_height - th - padding - 20
                
                # Draw background for readability
                bg_rect = [tx - padding, ty - padding, tx + tw + padding, ty + th + padding]
                draw.rectangle(bg_rect, fill=(0, 0, 0, 128))
                draw.text((tx, ty), full_text, font=font, fill=(255, 255, 255, 255))

        # Convert to BGR for OpenCV then to bytes
        # img is already RGB from the loader
        frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        return frame.tobytes()

    def _crop_normalized(self, img, rect_norm):
        """Crops an image using normalized (0.0 to 1.0) coordinates"""
        x, y, w, h = rect_norm
        left = int(x * img.width)
        top = int(y * img.height)
        right = int((x + w) * img.width)
        bottom = int((y + h) * img.height)
        
        # Ensure we don't go out of bounds due to rounding
        right = min(right, img.width)
        bottom = min(bottom, img.height)
        
        # Ensure at least 1 pixel
        if right <= left: right = left + 1
        if bottom <= top: bottom = top + 1
        
        return img.crop((left, top, right, bottom))

    def _get_zoom_rect(self, img_size, paste_to, target_aspect, zoom_padding=32):
        """Calculates a normalized crop rectangle (x, y, w, h) that contains paste_to and matches target_aspect"""
        img_w, img_h = img_size
        px, py, pw, ph = paste_to
        
        # Add pixel-based padding to the patch area
        px -= zoom_padding
        py -= zoom_padding
        pw += 2 * zoom_padding
        ph += 2 * zoom_padding
        
        # Maintain aspect ratio
        patch_aspect = pw / ph
        if patch_aspect > target_aspect:
            # Patch is wider than target. Expand height.
            new_h = pw / target_aspect
            py -= (new_h - ph) / 2
            ph = new_h
        else:
            # Patch is taller than target. Expand width.
            new_w = ph * target_aspect
            px -= (new_w - pw) / 2
            pw = new_w
            
        # Ensure we don't zoom in TOO much (e.g. no more than 4x zoom)
        min_w = img_w / 4
        min_h = img_h / 4
        if pw < min_w:
            px -= (min_w - pw) / 2
            pw = min_w
        if ph < min_h:
            py -= (min_h - ph) / 2
            ph = min_h

        # Clamp to image bounds while trying to preserve size
        if px < 0: px = 0
        if py < 0: py = 0
        if px + pw > img_w: px = img_w - pw
        if py + ph > img_h: py = img_h - ph
        
        # Final clamp and ensure integers for normalization
        px = max(0, min(px, img_w - 1))
        py = max(0, min(py, img_h - 1))
        pw = max(1, min(pw, img_w - px))
        ph = max(1, min(ph, img_h - py))
        
        return (px / img_w, py / img_h, pw / img_w, ph / img_h)

    def _decode_base64_to_image(self, base64_str):
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            img_data = base64.b64decode(base64_str)
            return Image.open(io.BytesIO(img_data))
        except Exception as e:
            print(f"Error decoding base64 mask: {e}")
            return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Standalone Timelapse Creator")
    parser.add_argument("--workspace", type=str, required=True, help="Workspace name")
    parser.add_argument("--range", type=str, help="Commit range (e.g. 0..10 or genid1..genid2)")
    parser.add_argument("--fps", type=float, default=20.0, help="Frames per second")
    parser.add_argument("--max_side", type=int, default=0, help="Maximum side length")
    parser.add_argument("--width", type=int, default=0, help="Output width")
    parser.add_argument("--height", type=int, default=0, help="Output height")
    parser.add_argument("--last_frame_duration", type=float, default=5.0, help="Last frame duration in seconds")
    parser.add_argument("--frame_duration", type=float, default=200, help="Duration for each commit in milliseconds")
    parser.add_argument("--translate_speed", type=float, default=5.0, help="Speed multiplier for transitions (default: 1.0)")
    parser.add_argument("--zoom_padding", type=int, default=0, help="Pixels of padding around the partial area (default: 32)")
    parser.add_argument("--quality", type=str, choices=["low", "medium", "high", "ultra"], default="high", help="Encoding quality (default: medium)")
    parser.add_argument("--show_mask", action="store_true", help="Show the partial candidate mask briefly before transition")
    parser.add_argument("--source_mask", type=str, choices=["mask", "diffMask"], default="mask", help="Which mask to use if both are present (default: mask)")
    parser.add_argument("--mask_duration", type=float, default=100, help="Duration to show the mask in milliseconds (default: 500)")
    parser.add_argument("--show_timestamp", action="store_true", help="Show timestamp on frames")
    parser.add_argument("--show_source", action="store_true", help="Show generation source (txt2img, etc) on frames")
    parser.add_argument("--zoom_into_partials", action="store_true", help="Zoom into partial candidates")
    parser.add_argument("--optimization", type=str, choices=["high", "low"], default="high", help="Optimization level (default: high)")
    parser.add_argument("--workspace_root", type=str, default="workspaces", help="Path to workspaces root")

    args = parser.parse_args()

    # Mock API and WorkspaceManager
    class MockWorkspaceManager:
        def __init__(self, root):
            self.root = Path(root).resolve()
        def _resolve_workspace_path(self, name):
            return self.root / name

    class MockAPI:
        def __init__(self, root):
            self.workspace_manager = MockWorkspaceManager(root)
        def add_api_route(self, *args, **kwargs):
            pass

    mock_api = MockAPI(args.workspace_root)
    creator = TimelapseCreator(mock_api)

    # Start timelapse
    async def run():
        params = vars(args)
        params.pop("workspace_root")
        result = await creator.start_timelapse(**params)
        job_id = result["job_id"]
        print(f"Started job: {job_id}")
        
        # Poll for completion
        while True:
            status = await creator.get_status(job_id)
            print(f"Progress: {status['progress']}% - {status['message']}")
            if status["status"] in ["completed", "failed"]:
                if status["status"] == "completed":
                    print(f"Success! Output: {status.get('output_path')}")
                else:
                    print(f"Failed: {status.get('error')}")
                break
            await asyncio.sleep(1)

    asyncio.run(run())
