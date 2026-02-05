import os
from PIL import Image
from pathlib import Path
import argparse

def _convert_image(png_path: Path, webp_path: Path):
    """Convert a PNG -> WEBP if PNG exists."""
    if not png_path.exists():
        return

    try:
        if webp_path.exists():
            print(f"  {webp_path} already exists. Skipping.")
            png_path.unlink()
            print(f"  Deleted redundant {png_path}")
            return

        print(f"  Converting {png_path.name} to {webp_path.name}...")
        with Image.open(png_path) as img:
            img.save(webp_path, format="WEBP", lossless=True, quality=100)
    except Exception as e:
        print(f"  Error processing {png_path}: {e}")

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

    file_pairs = [("full.png", "full.webp"), ("512.png", "512.webp")]

    for base_path in paths_to_check:
        print(f"Processing {base_path}...")
        for commit_dir in base_path.iterdir():
            if not commit_dir.is_dir():
                continue

            for png_name, webp_name in file_pairs:
                png_path = commit_dir / png_name
                webp_path = commit_dir / webp_name
                _convert_image(png_path, webp_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PNGs to WEBP in a workspace")
    parser.add_argument("--workspace", type=str, required=True, help="Path to workspace directory")
    
    args = parser.parse_args()
    convert_png_to_webp(args.workspace)
