#!/usr/bin/env python3
"""
Diff Builder Script

Scans two directories and creates a diff filetree containing only changed files
with their content diffs. Excludes specified directories.
"""

import os
import difflib
import argparse
from pathlib import Path
import sys

# Directories to exclude from comparison
EXCLUDE_DIRS = {
    'venv',
    'client',
    'Webui-BetterPrompt',
    '__pycache__',
    '.git',
    'node_modules',
    'dist',
    'build',
    'cache',
    'outputs',
    'tmp',
    'viteui-diff',
    "original-forge",
    "workspaces",
}

# File extensions to skip (binary files, etc.)
SKIP_EXTENSIONS = {
    '.pyc', '.pyo', '.pyd',  # Compiled Python
    '.so', '.dll', '.exe',   # Binary files
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',  # Images
    '.zip', '.tar', '.gz', '.bz2', '.7z',  # Archives
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',  # Documents
    '.mp4', '.avi', '.mkv', '.mov',  # Videos
    '.mp3', '.wav', '.flac',  # Audio
    '.ttf', '.otf', '.woff', '.woff2',  # Fonts
    '.model', '.safetensors', '.ckpt', '.pth',  # ML models
}

def should_skip_path(path, base_path):
    """Check if a path should be skipped based on exclusions."""
    # Check if any parent directory is in exclude list
    parts = path.relative_to(base_path).parts
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True

    # Check file extensions
    if path.suffix.lower() in SKIP_EXTENSIONS:
        return True

    return False

def is_text_file(filepath):
    """Check if a file is likely a text file."""
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            # Check for null bytes (indicates binary)
            if b'\x00' in chunk:
                return False
            # Try to decode as UTF-8
            chunk.decode('utf-8')
            return True
    except (UnicodeDecodeError, OSError):
        return False

def get_file_content(filepath):
    """Read file content, handling encoding errors."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.readlines()
    except UnicodeDecodeError:
        # Try with different encodings
        for encoding in ['latin-1', 'cp1252']:
            try:
                with open(filepath, 'r', encoding=encoding) as f:
                    return f.readlines()
            except UnicodeDecodeError:
                continue
        # If all encodings fail, return empty list
        return []
    except OSError:
        return []

def get_comment_syntax(filepath):
    """Get the appropriate comment syntax for a file type."""
    if isinstance(filepath, str):
        from pathlib import Path
        ext = Path(filepath).suffix.lower()
    else:
        ext = filepath.suffix.lower()
    if ext in ['.py', '.sh', '.bash', '.zsh', '.md', '.txt', '.yml', '.yaml', '.json', '.csv', '.ini', '.cfg', '.toml']:
        return ('#', '#')
    elif ext in ['.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', '.hpp', '.cs']:
        return ('//', '//')
    elif ext in ['.css', '.scss', '.sass', '.less']:
        return ('/*', '*/')
    elif ext in ['.html', '.xml', '.svg']:
        return ('<!--', '-->')
    elif ext in ['.bat', '.cmd']:
        return ('REM ', '')
    elif ext in ['.sql']:
        return ('-- ', '')
    else:
        return ('#', '#')

def should_comment_removed(filepath):
    """Check if removed code should be commented out for this file type."""
    if isinstance(filepath, str):
        from pathlib import Path
        ext = Path(filepath).suffix.lower()
    else:
        ext = filepath.suffix.lower()
    # For now, only comment out removed code in Python files
    return ext == '.py'

def count_changes(diff_lines, comment_start):
    """Count the number of deletions and additions in diff content based on markers."""
    deletions = 0
    additions = 0
    in_addition = False

    for line in diff_lines:
        if line.startswith(f"{comment_start}-"):
            # Count removed lines
            deletions += 1
        elif line.startswith(f"{comment_start}+") and not line.startswith(f"{comment_start}end+"):
            # Start of addition block
            in_addition = True
        elif line.startswith(f"{comment_start}end+"):
            # End of addition block
            in_addition = False
        elif in_addition:
            # Count added lines within addition blocks
            additions += 1

    return deletions, additions

def generate_comment_diff(original_path, current_path, relative_path):
    """Generate a comment-based diff that includes the full file content with changes marked."""
    original_content = get_file_content(original_path)
    current_content = get_file_content(current_path)

    # Get comment syntax for this file type
    comment_start, comment_end = get_comment_syntax(relative_path)

    # If files are identical, just return the content without comments
    if original_content == current_content:
        return current_content

    # Check if this file type should have removed code commented out
    comment_removed = should_comment_removed(relative_path)

    if not comment_removed:
        # For non-Python files, just return current content
        return current_content

    # Use SequenceMatcher to find differences and build full content with markers
    matcher = difflib.SequenceMatcher(None, original_content, current_content)
    output_lines = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Unchanged lines - add them as-is
            for line in current_content[j1:j2]:
                output_lines.append(line.rstrip())
        elif tag == 'delete':
            # Removed lines - add them as comments
            for line in original_content[i1:i2]:
                if line.strip():  # Only comment non-empty lines
                    output_lines.append(f"{comment_start}- {line.rstrip()}")
                else:
                    output_lines.append(line.rstrip())
        elif tag == 'insert':
            # Added lines - mark with #+ and add the lines
            if i1 < i2 or j1 < j2:  # Only add markers if there are actual changes
                output_lines.append(f"{comment_start}+")
            for line in current_content[j1:j2]:
                output_lines.append(line.rstrip())
            if i1 < i2 or j1 < j2:  # Only add end marker if there are actual changes
                output_lines.append(f"{comment_start}end+")
        elif tag == 'replace':
            # Lines were replaced - show removed lines as comments, then added lines
            # First show removed lines
            for line in original_content[i1:i2]:
                if line.strip():  # Only comment non-empty lines
                    output_lines.append(f"{comment_start}- {line.rstrip()}")
                else:
                    output_lines.append(line.rstrip())

            # Then show added lines
            if i1 != i2 or j1 != j2:  # Only add markers if there are actual changes
                output_lines.append(f"{comment_start}+")
            for line in current_content[j1:j2]:
                output_lines.append(line.rstrip())
            if i1 != i2 or j1 != j2:  # Only add end marker if there are actual changes
                output_lines.append(f"{comment_start}end+")

    return output_lines

def collect_files(base_path):
    """Collect all files in a directory tree, respecting exclusions."""
    files = {}
    for root, dirs, filenames in os.walk(base_path):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        root_path = Path(root)
        for filename in filenames:
            filepath = root_path / filename
            relative_path = filepath.relative_to(base_path)

            if should_skip_path(filepath, base_path):
                continue

            if not is_text_file(filepath):
                continue

            files[relative_path] = filepath

    return files

def main():
    parser = argparse.ArgumentParser(description='Build diff filetree between two directories')
    parser.add_argument('original_dir', help='Path to original directory')
    parser.add_argument('current_dir', help='Path to current directory')
    parser.add_argument('--output-dir', default='diff-output',
                       help='Output directory for diff files (default: diff-output)')

    args = parser.parse_args()

    original_dir = Path(args.original_dir)
    current_dir = Path(args.current_dir)
    output_dir = Path(args.output_dir)

    if not original_dir.exists():
        print(f"Error: Original directory '{original_dir}' does not exist")
        sys.exit(1)

    if not current_dir.exists():
        print(f"Error: Current directory '{current_dir}' does not exist")
        sys.exit(1)

    # Collect files from both directories
    print("Scanning original directory...")
    original_files = collect_files(original_dir)

    print("Scanning current directory...")
    current_files = collect_files(current_dir)

    # Find changed, added, and deleted files
    all_paths = set(original_files.keys()) | set(current_files.keys())
    changed_files = []
    added_files = []
    deleted_files = []

    for path in all_paths:
        in_original = path in original_files
        in_current = path in current_files

        if in_original and in_current:
            # File exists in both - check if changed
            orig_content = get_file_content(original_files[path])
            curr_content = get_file_content(current_files[path])

            if orig_content != curr_content and should_comment_removed(path):
                changed_files.append(path)
        elif in_current:
            added_files.append(path)
        else:
            deleted_files.append(path)

    print(f"Found {len(changed_files)} changed files, {len(added_files)} added files, {len(deleted_files)} deleted files")

    # Create output directory structure and generate diffs
    # Clear existing output directory if it exists
    if output_dir.exists():
        import shutil
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Process changed files and calculate change counts
    changed_files_with_counts = []
    for i, path in enumerate(changed_files):
        print(f"Processing changed file {i+1}/{len(changed_files)}: {path}")

        output_path = output_dir / path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        diff_content = generate_comment_diff(
            original_files[path],
            current_files[path],
            path
        )

        # Calculate change counts (deletions, additions)
        comment_start, _ = get_comment_syntax(path)
        deletions, additions = count_changes(diff_content, comment_start)
        changed_files_with_counts.append((path, deletions, additions))

        # Always write the content (with or without change markers)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(diff_content))

    # Sort changed files by total changes (deletions + additions) descending
    changed_files_with_counts.sort(key=lambda x: x[1] + x[2], reverse=True)
    changed_files = [path for path, _, _ in changed_files_with_counts]

    # Process added files (copy entire content)
    for i, path in enumerate(added_files):
        print(f"Processing added file {i+1}/{len(added_files)}: {path}")

        output_path = output_dir / path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            content = get_file_content(current_files[path])
            with open(output_path, 'w', encoding='utf-8') as f:
                comment_start, _ = get_comment_syntax(path)
                f.write(f'{comment_start} NEW FILE\n')
                f.write(''.join(content))
        except Exception as e:
            print(f"Error processing added file {path}: {e}")

    # Process deleted files (mark as deleted)
    for i, path in enumerate(deleted_files):
        print(f"Processing deleted file {i+1}/{len(deleted_files)}: {path}")

        output_path = output_dir / path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            content = get_file_content(original_files[path])
            with open(output_path, 'w', encoding='utf-8') as f:
                comment_start, _ = get_comment_syntax(path)
                f.write(f'{comment_start} DELETED FILE\n')
                f.write(''.join(content))
        except Exception as e:
            print(f"Error processing deleted file {path}: {e}")

    print(f"\nDiff generation complete. Output saved to: {output_dir.absolute()}")

    # Generate summary
    summary_path = output_dir / 'DIFF_SUMMARY.txt'
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(f"Diff Summary\n")
        f.write(f"============\n\n")
        f.write(f"== USE #\+|#end\+ REGEX TO FIND ADDED AND REMOVED CODE ==\n\n")
        f.write(f"============\n\n")
        f.write(f"Original directory: {original_dir.absolute()}\n")
        f.write(f"Current directory: {current_dir.absolute()}\n")
        f.write(f"Output directory: {output_dir.absolute()}\n\n")
        f.write(f"Changed files: {len(changed_files)}\n")
        f.write(f"Added files: {len(added_files)}\n")
        f.write(f"Deleted files: {len(deleted_files)}\n\n")

        if changed_files:
            f.write("Changed files (sorted by number of changes):\n")
            for path, deletions, additions in changed_files_with_counts:
                f.write(f"  {path} (-{deletions} +{additions})\n")

        if added_files:
            f.write("\nAdded files:\n")
            for path in added_files:
                f.write(f"  {path}\n")

        if deleted_files:
            f.write("\nDeleted files:\n")
            for path in deleted_files:
                f.write(f"  {path}\n")

if __name__ == '__main__':
    main()