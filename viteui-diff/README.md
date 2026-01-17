# ViteUI Diff Builder

This script compares two directories and creates a diff filetree containing only changed files with their content diffs.

## Features

- **Changed Files**: Only includes files that have been modified between the original and current directories
- **Full Content**: Modified files contain their complete current content with preserved formatting
- **Directory Structure**: Maintains the same directory structure as the original
- **Exclusions**: Automatically excludes common directories like `venv`, `client`, `Webui-BetterPrompt`, etc.
- **Text Files Only**: Only processes text files, skipping binary files, images, etc.

## Usage

### Option 1: Using the batch script (Windows)
```batch
run_diff.bat
```

This will automatically use the predefined paths:
- Original: `C:\Users\wumbl\Documents\DEV\original-forge`
- Current: `C:\Users\wumbl\Documents\DEV\stable-diffusion-viteui-forge`
- Output: `viteui-diff/diff-output`

### Option 2: Using Python directly
```bash
python diff_builder.py <original_dir> <current_dir> [--output-dir <output_dir>]
```

## Output Structure

The output directory will contain:
- **Changed files**: Complete current file content with preserved formatting
- **Added files**: Full content with "# NEW FILE" header
- **Deleted files**: Original content with "# DELETED FILE" header
- **DIFF_SUMMARY.txt**: Summary of all changes found

## Content Preservation

The script preserves the exact formatting and content of all modified files:

- **Indentation**: All original spacing and indentation maintained
- **Comments**: All existing comments preserved
- **Structure**: Complete file content included for modified files
- **Encoding**: Proper text encoding handling

## Excluded Directories

The following directories are automatically excluded:
- `venv`
- `client`
- `Webui-BetterPrompt`
- `__pycache__`
- `.git`
- `node_modules`
- `dist`
- `build`
- `cache`
- `outputs`
- `tmp`

## Excluded File Types

Binary and large files are skipped:
- Python bytecode (.pyc, .pyo, .pyd)
- Images (.jpg, .png, .gif, etc.)
- Archives (.zip, .tar, .gz, etc.)
- Documents (.pdf, .doc, etc.)
- Media files (.mp4, .mp3, etc.)
- ML models (.safetensors, .ckpt, etc.)

## Example Output

```
diff-output/
├── modules/
│   └── ui.py
├── backend/
│   ├── loader.py
│   └── shared.py
└── DIFF_SUMMARY.txt
```

Each changed file will contain the complete current file content:

```
# Complete file content with exact formatting preserved
import module1
import module2

from pathlib import Path

def function():
    # All original formatting and comments maintained
    if condition:
        return True

    return False
```

## Requirements

- Python 3.6+
- No external dependencies required (uses only standard library)