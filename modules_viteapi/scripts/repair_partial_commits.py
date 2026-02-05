import os
import json
import numpy as np
from PIL import Image, ImageChops, ImageFilter
from pathlib import Path
import argparse
import io
import base64

def repair_workspace(workspace_name, target_genid=None, source_genid=None, force=False):
    workspace_root = Path("workspaces")
    workspace_path = workspace_root / workspace_name
    commits_path = workspace_path / "commits"
    
    if not commits_path.exists():
        print(f"Workspace {workspace_name} not found or has no commits.")
        return

    # Collect and sort commits by GEN ID (folder name) to ensure correct order
    all_commits = []
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
                all_commits.append({"genid": genid_dir.name, "timestamp": timestamp})
        except Exception:
            continue
            
    all_commits.sort(key=lambda x: x["genid"])

    # If target_genid is provided, we only repair that one
    if target_genid:
        genids_to_repair = [target_genid]
    else:
        genids_to_repair = [c["genid"] for c in all_commits]

    for genid in genids_to_repair:
        # Find previous genid for this genid
        previous_genid = None
        for i, c in enumerate(all_commits):
            if c["genid"] == genid:
                if i > 0:
                    previous_genid = all_commits[i-1]["genid"]
                break
        
        repair_commit(workspace_name, genid, manual_source_genid=source_genid, previous_genid=previous_genid, force=force)

def repair_commit(workspace_name, genid, manual_source_genid=None, previous_genid=None, force=False):
    workspace_root = Path("workspaces")
    commit_path = workspace_root / workspace_name / "commits" / genid
    meta_path = commit_path / "meta.json"
    
    if not meta_path.exists():
        return

    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    # Check if this commit expects partial candidates
    params = meta.get("parameters", {})
    if not params.get("return_partial_candidates") and not force:
        return

    # Check if partial_candidate already exists
    partial_folder = commit_path / "partial_candidate"
    existing_meta = None
    if (partial_folder / "meta.json").exists():
        try:
            with open(partial_folder / "meta.json", 'r', encoding='utf-8') as f:
                existing_meta = json.load(f)
                if existing_meta.get("partial_candidates_info") and existing_meta["partial_candidates_info"][0].get("diffMask"):
                    print(f"Commit {genid} already has diffMask. Skipping.")
                    return
        except Exception:
            pass

    # Source genid strategy: manual > metadata > previous commit
    source_genid = manual_source_genid or meta.get("source_genid") or previous_genid
    if not source_genid:
        print(f"Commit {genid} has no source_genid and no previous commit found. Cannot extrapolate.")
        return

    source_path = workspace_root / workspace_name / "commits" / source_genid / "full.webp"
    target_path = commit_path / "full.webp"

    if not source_path.exists() or not target_path.exists():
        print(f"Source or target image missing for {genid} (source: {source_genid})")
        return

    print(f"Repairing commit {genid} using source {source_genid} (base64 mask)...")

    # Load images
    img_source = Image.open(source_path).convert("RGB")
    img_target = Image.open(target_path).convert("RGB")

    if img_source.size != img_target.size:
        print(f"Size mismatch: {img_source.size} vs {img_target.size}. Resizing source to match target.")
        img_source = img_source.resize(img_target.size, Image.Resampling.LANCZOS)

    # Compute difference
    diff = ImageChops.difference(img_source, img_target)
    diff_gray = diff.convert("L")
    
    # Threshold to find changed areas
    threshold = 2 
    mask_arr = np.array(diff_gray)
    binary_mask = (mask_arr > threshold).astype(np.uint8) * 255
    
    if not np.any(binary_mask):
        print(f"No difference found between {genid} and {source_genid}.")
        return

    # Find bounding box of changes
    coords = np.argwhere(binary_mask)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    
    # Add some padding to the bounding box
    padding = 16
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(img_target.width - 1, x1 + padding)
    y1 = min(img_target.height - 1, y1 + padding)
    
    w = x1 - x0 + 1
    h = y1 - y0 + 1
    
    paste_to = [int(x0), int(y0), int(w), int(h)]

    # Create the partial_candidate folder
    partial_folder.mkdir(parents=True, exist_ok=True)

    # Prepare mask image of the WHOLE image
    mask_img = Image.fromarray(binary_mask).filter(ImageFilter.GaussianBlur(radius=4))
    
    # Convert mask to base64
    buffered = io.BytesIO()
    mask_img.save(buffered, format="PNG")
    mask_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    # Create or update meta.json in partial_candidate
    if existing_meta and existing_meta.get("partial_candidates_info"):
        partial_meta = existing_meta
        info = partial_meta["partial_candidates_info"][0]
        # If mask already exists, we store the new one as diffMask to avoid overwriting
        if "mask" in info:
            info["diffMask"] = mask_base64
        else:
            info["mask"] = mask_base64
        info["paste_to"] = paste_to
    else:
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

    # Remove full.webp and mask.webp if they existed from previous run
    for extra in ["full.webp", "mask.webp"]:
        if (partial_folder / extra).exists():
            (partial_folder / extra).unlink()

    print(f"  Repair complete for {genid} (base64 mask stored in meta.json).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Repair missing partial_candidate folders")
    parser.add_argument("--workspace", type=str, required=True, help="Workspace name")
    parser.add_argument("--genid", type=str, help="Target commit genid (optional)")
    parser.add_argument("--source", type=str, help="Manual source genid (optional)")
    parser.add_argument("--force", action="store_true", help="Repair even if return_partial_candidates is False")
    
    args = parser.parse_args()
    repair_workspace(args.workspace, target_genid=args.genid, source_genid=args.source, force=args.force)
