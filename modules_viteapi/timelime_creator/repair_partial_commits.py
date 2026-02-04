import os
import json
import numpy as np
from PIL import Image, ImageChops, ImageFilter
from pathlib import Path

def repair_commit_logic(workspace_path, genid, manual_source_genid=None, previous_genid=None, force=False):
    commit_path = workspace_path / "commits" / genid
    meta_path = commit_path / "meta.json"
    
    if not meta_path.exists():
        return False, f"Meta not found for {genid}"

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    except Exception as e:
        return False, f"Failed to read meta for {genid}: {e}"

    params = meta.get("parameters", {})
    if not params.get("return_partial_candidates") and not force:
        return False, f"Commit {genid} does not require partial candidates."

    partial_folder = commit_path / "partial_candidate"
    
    # Check if already has repaired meta
    if (partial_folder / "meta.json").exists():
        try:
            with open(partial_folder / "meta.json", 'r', encoding='utf-8') as f:
                p_meta = json.load(f)
                if p_meta.get("partial_candidates_info") and p_meta["partial_candidates_info"][0].get("mask"):
                    return False, f"Commit {genid} already has repaired meta."
        except Exception:
            pass

    # Source genid strategy: manual > metadata > previous commit
    source_genid = manual_source_genid or meta.get("source_genid") or previous_genid
    if not source_genid:
        return False, f"Commit {genid} has no source_genid and no previous commit found."

    source_path = workspace_path / "commits" / source_genid / "full.webp"
    target_path = commit_path / "full.webp"

    if not source_path.exists() or not target_path.exists():
        return False, f"Source or target image missing for {genid} (source: {source_genid})"

    # Load images
    try:
        img_source = Image.open(source_path).convert("RGB")
        img_target = Image.open(target_path).convert("RGB")

        if img_source.size != img_target.size:
            img_source = img_source.resize(img_target.size, Image.Resampling.LANCZOS)

        # Compute difference
        diff = ImageChops.difference(img_source, img_target)
        diff_gray = diff.convert("L")
        
        # Threshold to find changed areas
        threshold = 2 
        mask_arr = np.array(diff_gray)
        binary_mask = (mask_arr > threshold).astype(np.uint8) * 255
        
        if not np.any(binary_mask):
            return False, f"No difference found between {genid} and {source_genid}."

        # Find bounding box of changes
        coords = np.argwhere(binary_mask)
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        
        # Add padding
        padding = 16
        x0 = max(0, x0 - padding)
        y0 = max(0, y0 - padding)
        x1 = min(img_target.width - 1, x1 + padding)
        y1 = min(img_target.height - 1, y1 + padding)
        
        w = x1 - x0 + 1
        h = y1 - y0 + 1
        
        paste_to = [int(x0), int(y0), int(w), int(h)]

        # Create folder
        partial_folder.mkdir(parents=True, exist_ok=True)

        # Convert full mask to base64
        mask_img = Image.fromarray(binary_mask).filter(ImageFilter.GaussianBlur(radius=4))
        import io
        import base64
        buffered = io.BytesIO()
        mask_img.save(buffered, format="PNG")
        mask_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        # Create meta.json
        partial_meta = {
            "full_width": img_target.width,
            "full_height": img_target.height,
            "partial_candidates_info": [
                {
                    "paste_to": paste_to,
                    "mask_blur": 4,
                    "mask": mask_base64
                }
            ]
        }
        with open(partial_folder / "meta.json", 'w', encoding='utf-8') as f:
            json.dump(partial_meta, f, indent=2)

        return True, f"Repaired {genid} using {source_genid} with paste_to {paste_to} (base64 mask)"
    except Exception as e:
        return False, f"Error repairing {genid}: {e}"

def scan_and_repair_workspace(workspace_root, workspace_name, force=False):
    workspace_path = Path(workspace_root) / workspace_name
    commits_path = workspace_path / "commits"
    
    if not commits_path.exists():
        return []

    # Collect and sort commits by timestamp
    commits = []
    for genid_dir in commits_path.iterdir():
        if not genid_dir.is_dir():
            continue
        
        meta_path = genid_dir / "meta.json"
        if not meta_path.exists():
            continue
            
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
                timestamp = meta.get("timestamp", 0)
                commits.append({"genid": genid_dir.name, "timestamp": timestamp})
        except Exception:
            continue
            
    # Sort by GEN ID (folder name) to ensure correct order
    commits.sort(key=lambda x: x["genid"])

    results = []
    for i, commit in enumerate(commits):
        genid = commit["genid"]
        previous_genid = commits[i-1]["genid"] if i > 0 else None
        
        success, message = repair_commit_logic(workspace_path, genid, previous_genid=previous_genid, force=force)
        if success or "already has" not in message: # Log if it was an attempt
             results.append({"genid": genid, "success": success, "message": message})
             if success:
                 print(message)
    
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=str, required=True)
    parser.add_argument("--root", type=str, default="workspaces")
    parser.add_argument("--force", action="store_true", help="Repair even if return_partial_candidates is False")
    args = parser.parse_args()
    
    scan_and_repair_workspace(args.root, args.workspace, force=args.force)
