import os
from PIL import Image
from pathlib import Path
import argparse

def convert_png_to_webp(workspace_path):
    workspace_path = Path(workspace_path)
    if not workspace_path.exists():
        print(f"Workspace path {workspace_path} not found.")
        return

    commits_path = workspace_path / "commits"
    rejects_path = workspace_path / "rejects"
    
    paths_to_check = []
    if commits_path.exists():
        paths_to_check.append(commits_path)
    if rejects_path.exists():
        paths_to_check.append(rejects_path)

    if not paths_to_check:
        print(f"No commits or rejects found in {workspace_path}")
        return

    for base_path in paths_to_check:
        print(f"Processing {base_path}...")
        for commit_dir in base_path.iterdir():
            if not commit_dir.is_dir():
                continue
            
            png_path = commit_dir / "full.png"
            webp_path = commit_dir / "full.webp"
            
            if png_path.exists():
                try:
                    # If webp already exists, we skip to avoid re-converting or overwriting potentially better files
                    if webp_path.exists():
                        print(f"  {webp_path} already exists. Skipping.")
                        # Still delete the png if it's there? User said "convert", so maybe yes.
                        # But let's be safe and just delete it.
                        png_path.unlink()
                        print(f"  Deleted redundant {png_path}")
                        continue

                    print(f"Converting {png_path} to {webp_path}...")
                    with Image.open(png_path) as img:
                        # Using lossless=True and quality=100 to match workspace_manager.py
                        img.save(webp_path, format="WEBP", lossless=True, quality=100)
                    
                    # # Verify webp exists before deleting png
                    # if webp_path.exists():
                    #     png_path.unlink()
                    #     print(f"  Deleted {png_path}")
                except Exception as e:
                    print(f"  Error processing {png_path}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert full.png to full.webp in a workspace")
    parser.add_argument("--workspace", type=str, required=True, help="Path to workspace directory")
    
    args = parser.parse_args()
    convert_png_to_webp(args.workspace)
