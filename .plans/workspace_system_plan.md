# Workspace System Implementation Plan

## Overview
Implement a comprehensive workspace system that makes workspace usage the default behavior. All image generation and operations happen within workspace context. The client always starts with an active workspace - either the latest workspace or a new "untitled" workspace if none exists.

## Core Components

### 1. Backend Workspace Management

#### 1.1 Workspace Structure
```
workspaces/
├── project1/
│   ├── commits/
│   │   ├── 2024-01-18_14-30-15_001/
│   │   │   ├── image.png
│   │   │   └── mask.png
│   │   └── 2024-01-18_14-31-20_002/
│   │       ├── image.png
│   │       └── mask.png
│   └── rejects/
│       ├── 2024-01-18_14-32-10_001/
│       │   ├── image.png
│       │   └── mask.png
│       └── 2024-01-18_14-33-05_002/
│           ├── image.png
│           └── mask.png
└── project2/
    ├── commits/
    └── rejects/
```

#### 1.2 New API Endpoints

**Workspace Management:**
- `GET /api/workspaces` - List all workspaces
- `POST /api/workspaces` - Create new workspace
- `DELETE /api/workspaces/{name}` - Delete workspace
- `GET /api/workspaces/{name}` - Get workspace info

**Project Organization:**
- `POST /api/workspaces/{name}/folders` - Create folder for organization
- `GET /api/workspaces/{name}/structure` - Get workspace folder structure

**Image Serving:**
- `GET /api/workspaces/{name}/images/{path}` - Serve images with sendfile
- `GET /api/workspaces/{name}/previews/{path}` - Serve resized preview images

#### 1.3 Image Processing Module

**New file: `modules/workspace_images.py`**
```python
import os
from PIL import Image
import hashlib
from pathlib import Path

class WorkspaceImageManager:
    def __init__(self, workspace_root="workspaces"):
        self.workspace_root = Path(workspace_root)
        self.preview_max_size = 512  # Configurable

    def resize_for_preview(self, image_path, max_size=None):
        """Resize image for preview, maintaining aspect ratio"""
        max_size = max_size or self.preview_max_size
        with Image.open(image_path) as img:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            return img

    def save_preview(self, image_path, output_path):
        """Create and save preview image"""
        preview = self.resize_for_preview(image_path)
        preview.save(output_path, quality=85, optimize=True)

    def get_image_hash(self, image_path):
        """Get hash for image deduplication"""
        hash_md5 = hashlib.md5()
        with open(image_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
```

#### 1.4 Workspace Manager Module

**New file: `modules/workspace_manager.py`**
```python
import os
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

class WorkspaceManager:
    def __init__(self, workspace_root="workspaces"):
        self.workspace_root = Path(workspace_root)
        self.workspace_root.mkdir(exist_ok=True)

    def create_workspace(self, name: str) -> bool:
        """Create new workspace with commits/rejects folders"""
        workspace_path = self.workspace_root / name
        if workspace_path.exists():
            return False

        workspace_path.mkdir()
        (workspace_path / "commits").mkdir()
        (workspace_path / "rejects").mkdir()

        # Create metadata file
        metadata = {
            "name": name,
            "created": datetime.now().isoformat(),
            "folders": []
        }
        self._save_metadata(workspace_path, metadata)
        return True

    def commit_image(self, workspace_name: str, image_path: str, mask_path: Optional[str] = None) -> str:
        """Commit image to workspace"""
        workspace_path = self.workspace_root / workspace_name
        commits_path = workspace_path / "commits"

        # Create timestamped folder
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        commit_id = f"{timestamp}_{self._get_next_id(commits_path)}"
        commit_path = commits_path / commit_id
        commit_path.mkdir()

        # Copy image and mask
        shutil.copy2(image_path, commit_path / "image.png")
        if mask_path and os.path.exists(mask_path):
            shutil.copy2(mask_path, commit_path / "mask.png")

        return commit_id

    def reject_image(self, workspace_name: str, image_path: str, mask_path: Optional[str] = None) -> str:
        """Reject image to workspace"""
        workspace_path = self.workspace_root / workspace_name
        rejects_path = workspace_path / "rejects"

        # Create timestamped folder
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        reject_id = f"{timestamp}_{self._get_next_id(rejects_path)}"
        reject_path = rejects_path / reject_id
        reject_path.mkdir()

        # Copy image and mask
        shutil.copy2(image_path, reject_path / "image.png")
        if mask_path and os.path.exists(mask_path):
            shutil.copy2(mask_path, reject_path / "mask.png")

        return reject_id

    def _get_next_id(self, path: Path) -> str:
        """Get next sequential ID for folder"""
        existing = [f.name.split('_')[-1] for f in path.iterdir() if f.is_dir()]
        existing_nums = [int(x) for x in existing if x.isdigit()]
        return f"{max(existing_nums) + 1:03d}" if existing_nums else "001"
```

### 2. API Modifications

#### 2.1 Add Workspace Routes to FastAPI

**File: `modules/api/api.py`**
```python
# Add imports
from modules.workspace_manager import WorkspaceManager
from modules.workspace_images import WorkspaceImageManager
from fastapi.responses import FileResponse

# Initialize managers
workspace_manager = WorkspaceManager()
image_manager = WorkspaceImageManager()

# Add routes
@router.get("/workspaces")
async def list_workspaces():
    """List all workspaces"""
    workspaces = []
    for workspace_dir in workspace_manager.workspace_root.iterdir():
        if workspace_dir.is_dir():
            metadata = workspace_manager._load_metadata(workspace_dir)
            workspaces.append({
                "name": workspace_dir.name,
                "created": metadata.get("created"),
                "folders": metadata.get("folders", [])
            })
    return {"workspaces": workspaces}

@router.post("/workspaces")
async def create_workspace(name: str):
    """Create new workspace"""
    if workspace_manager.create_workspace(name):
        return {"success": True, "message": f"Workspace '{name}' created"}
    return {"success": False, "message": f"Workspace '{name}' already exists"}

@router.get("/workspaces/{name}/images/{path:path}")
async def serve_workspace_image(name: str, path: str):
    """Serve workspace images with sendfile"""
    workspace_path = workspace_manager.workspace_root / name
    image_path = workspace_path / path

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(image_path, media_type='image/png')

@router.get("/workspaces/{name}/previews/{path:path}")
async def serve_workspace_preview(name: str, path: str):
    """Serve resized preview images"""
    workspace_path = workspace_manager.workspace_root / name
    image_path = workspace_path / path
    preview_path = workspace_path / "previews" / path

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Create preview if it doesn't exist
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    if not preview_path.exists():
        image_manager.save_preview(str(image_path), str(preview_path))

    return FileResponse(preview_path, media_type='image/jpeg')
```

#### 2.2 Modify Existing Generation Endpoints

**Update txt2img and img2img endpoints to require workspace context:**

```python
# Add workspace parameters to request models (now required)
class WorkspaceProcessingRequest:
    workspace_name: str  # Required: workspace for all operations
    auto_commit: bool = False  # Auto-commit on generation

# Modify response to always include filesystem paths
class TextToImageResponse:
    images: List[str]  # base64 for backward compatibility
    filesystem_paths: List[str]  # Required: paths to saved images in workspace
    workspace_info: Dict  # Required: workspace commit info
```

### 3. Frontend UI Changes

#### 3.1 Workspace Picker Component

**New file: `client/src/components/WorkspacePicker.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { Folder, Plus, FolderOpen } from 'lucide-react';

const WorkspacePicker = ({ currentWorkspace, onWorkspaceChange }) => {
    const [workspaces, setWorkspaces] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        const response = await fetch('/api/workspaces');
        const data = await response.json();
        setWorkspaces(data.workspaces);

        // If no current workspace is set, auto-select the latest one
        if (!currentWorkspace && data.workspaces.length > 0) {
            // Sort by creation date (newest first) and select the first
            const sortedWorkspaces = data.workspaces.sort((a, b) =>
                new Date(b.created) - new Date(a.created)
            );
            onWorkspaceChange(sortedWorkspaces[0].name);
        }
    };

    const createWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;

        const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newWorkspaceName })
        });

        if (response.ok) {
            await loadWorkspaces();
            onWorkspaceChange(newWorkspaceName);
            setShowCreate(false);
            setNewWorkspaceName('');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <select
                value={currentWorkspace || ''}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="bg-studio-panel border border-studio-border rounded px-2 py-1 text-sm"
            >
                {workspaces.map(ws => (
                    <option key={ws.name} value={ws.name}>{ws.name}</option>
                ))}
            </select>
            <button
                onClick={() => setShowCreate(true)}
                className="p-1 hover:bg-studio-surface rounded"
                title="New Workspace"
            >
                <Plus className="w-4 h-4" />
            </button>
            <button
                onClick={() => {/* Open workspace browser */}}
                className="p-1 hover:bg-studio-surface rounded"
                title="Open Workspace"
            >
                <FolderOpen className="w-4 h-4" />
            </button>

            {showCreate && (
                <div className="absolute top-full mt-2 bg-studio-panel border border-studio-border rounded p-3 shadow-lg">
                    <input
                        type="text"
                        placeholder="Workspace name"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        className="w-full px-2 py-1 bg-studio-surface border border-studio-border rounded mb-2"
                        onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={createWorkspace}
                            className="px-3 py-1 bg-studio-accent text-white rounded text-sm"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="px-3 py-1 bg-studio-surface text-studio-textSecondary rounded text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
```

#### 3.2 Workspace Browser Modal

**New file: `client/src/components/WorkspaceBrowser.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { Folder, FileImage, ChevronRight, ChevronDown } from 'lucide-react';

const WorkspaceBrowser = ({ workspaceName, onSelect, onClose }) => {
    const [structure, setStructure] = useState(null);
    const [expanded, setExpanded] = useState(new Set(['commits', 'rejects']));

    useEffect(() => {
        loadStructure();
    }, [workspaceName]);

    const loadStructure = async () => {
        const response = await fetch(`/api/workspaces/${workspaceName}/structure`);
        const data = await response.json();
        setStructure(data.structure);
    };

    const toggleExpanded = (path) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpanded(newExpanded);
    };

    const renderTree = (node, path = '') => {
        const fullPath = path ? `${path}/${node.name}` : node.name;
        const isExpanded = expanded.has(fullPath);

        if (node.type === 'file') {
            return (
                <div
                    key={fullPath}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-studio-surface cursor-pointer"
                    onClick={() => onSelect(fullPath)}
                >
                    <FileImage className="w-4 h-4" />
                    <span className="text-sm">{node.name}</span>
                </div>
            );
        }

        return (
            <div key={fullPath}>
                <div
                    className="flex items-center gap-2 px-2 py-1 hover:bg-studio-surface cursor-pointer"
                    onClick={() => toggleExpanded(fullPath)}
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Folder className="w-4 h-4" />
                    <span className="text-sm font-medium">{node.name}</span>
                </div>
                {isExpanded && node.children && (
                    <div className="ml-4">
                        {node.children.map(child => renderTree(child, fullPath))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-studio-panel border border-studio-border rounded-lg w-96 max-h-96 overflow-hidden">
                <div className="p-4 border-b border-studio-border">
                    <h3 className="font-medium">Workspace: {workspaceName}</h3>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                    {structure ? renderTree(structure) : <div className="text-center py-4">Loading...</div>}
                </div>
                <div className="p-4 border-t border-studio-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-studio-surface text-studio-textSecondary rounded hover:bg-studio-border"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
```

#### 3.3 Update Header Component

**File: `client/src/components/Header.jsx`**
```jsx
// Add workspace picker to header
import WorkspacePicker from './WorkspacePicker';

const Header = ({ ...existingProps, currentWorkspace, onWorkspaceChange }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b border-studio-border">
            {/* Existing header content */}
            <div className="flex items-center gap-4">
                {/* ... existing items ... */}
            </div>

            {/* New workspace controls */}
            <div className="flex items-center gap-4">
                <WorkspacePicker
                    currentWorkspace={currentWorkspace}
                    onWorkspaceChange={onWorkspaceChange}
                />
                {/* ... other existing items ... */}
            </div>
        </div>
    );
};
```

#### 3.4 Update TimelineItem for Filesystem Paths

**File: `client/src/components/TimelineItem.jsx`**
```jsx
// Modify to accept filesystem path instead of base64
const TimelineItem = ({ item, isActive, onSelect, ...props }) => {
    // item.image can now be either base64 data URL or filesystem path
    const imageSrc = item.image.startsWith('data:')
        ? item.image
        : `/api/workspaces/${item.workspace}/previews/${item.image}`;

    return (
        // ... existing JSX with img src={imageSrc}
    );
};
```

#### 3.5 Update Canvas for Filesystem Images

**File: `client/src/components/Canvas.jsx`**
```jsx
// Update canvas to handle filesystem paths
const Canvas = ({ currentImage, previewImage, ...props }) => {
    const getImageSrc = (imageData) => {
        if (!imageData) return null;

        // If it's a filesystem path (starts with workspace indicator)
        if (imageData.startsWith('workspaces/')) {
            return `/api/workspaces/${imageData}`;
        }

        // Otherwise treat as base64
        return imageData;
    };

    const currentImageSrc = getImageSrc(currentImage);
    const previewImageSrc = getImageSrc(previewImage);

    // ... rest of component uses currentImageSrc and previewImageSrc
};
```

### 4. Integration Points

#### 4.1 State Management Updates

**File: `client/src/App.jsx`**
```jsx
// Workspace is now always required - initialize on app startup
const [currentWorkspace, setCurrentWorkspace] = useState(null);
const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);

// Initialize workspace on app startup
useEffect(() => {
    initializeWorkspace();
}, []);

const initializeWorkspace = async () => {
    try {
        // Load available workspaces
        const response = await fetch('/api/workspaces');
        const data = await response.json();

        if (data.workspaces.length > 0) {
            // Select the most recently created workspace
            const sortedWorkspaces = data.workspaces.sort((a, b) =>
                new Date(b.created) - new Date(a.created)
            );
            setCurrentWorkspace(sortedWorkspaces[0].name);
        } else {
            // No workspaces exist, create an "untitled" workspace
            const untitledResponse = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'untitled' })
            });

            if (untitledResponse.ok) {
                setCurrentWorkspace('untitled');
            }
        }
    } catch (error) {
        console.error('Failed to initialize workspace:', error);
        // Fallback: create untitled workspace
        try {
            const fallbackResponse = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'untitled' })
            });
            if (fallbackResponse.ok) {
                setCurrentWorkspace('untitled');
            }
        } catch (fallbackError) {
            console.error('Failed to create fallback workspace:', fallbackError);
        }
    }
};

// Update generation calls to always include workspace (now required)
const handleGenerate = async (params) => {
    if (!currentWorkspace) {
        console.error('No workspace active - this should not happen');
        return;
    }

    const requestBody = {
        ...params,
        workspace_name: currentWorkspace,
        // Include other workspace-related params
    };

    const response = await fetch('/api/txt2img', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    // Always use filesystem paths since workspace is always active
    if (result.filesystem_paths) {
        addToTimeline({
            image: result.filesystem_paths[0], // Relative path within workspace
            workspace: currentWorkspace,
            // ... other metadata
        });
    }
};
```

#### 4.2 Commit/Reject Functionality

**Hook into existing commit/reject system - no UI changes needed:**

The workspace system integrates with the existing commit/reject functionality. When a user commits or rejects an image through the current UI, the workspace system automatically saves the image to the appropriate folder.

**Update existing commit/reject handlers in App.jsx:**

```jsx
// Find existing handleCommit/handleReject functions and modify them:

const handleCommit = async (item) => {
    // Existing commit logic...

    // Add workspace integration
    if (currentWorkspace) {
        try {
            const response = await fetch(`/api/workspaces/${currentWorkspace}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_path: item.image,
                    mask_path: item.mask // if available
                })
            });

            if (response.ok) {
                const result = await response.json();
                // Optionally update item with commit info
                console.log(`Committed to workspace: ${result.commit_id}`);
            }
        } catch (error) {
            console.error('Failed to commit to workspace:', error);
        }
    }
};

const handleReject = async (item) => {
    // Existing reject logic...

    // Add workspace integration
    if (currentWorkspace) {
        try {
            const response = await fetch(`/api/workspaces/${currentWorkspace}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_path: item.image,
                    mask_path: item.mask // if available
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Rejected to workspace: ${result.reject_id}`);
            }
        } catch (error) {
            console.error('Failed to reject to workspace:', error);
        }
    }
};
```

This approach maintains the existing UI flow while adding workspace functionality behind the scenes.

### 5. Configuration

#### 5.1 Add to config.json
```json
{
    "workspace": {
        "preview_max_size": 512,
        "auto_commit": false,
        "preview_quality": 85
    }
}
```

### 6. Migration and Testing

#### 6.1 Workspace-First Architecture
- **Workspaces are now the default**: All operations require workspace context
- **Automatic workspace initialization**: App always starts with an active workspace
- **API changes**: workspace_name parameter is now required (not optional)
- **Filesystem-first**: Images are primarily served via filesystem paths with base64 as fallback

#### 6.2 Testing Scenarios (User will perform these tests)
1. **App startup**: Verify automatic workspace initialization (latest workspace or "untitled")
2. **Workspace switching**: Create new workspace and switch between workspaces
3. **Image generation**: Verify all generations save to active workspace folders
4. **Preview system**: Test image resizing and filesystem serving performance
5. **Commit/Reject**: Verify existing UI saves images to workspace commits/rejects folders
6. **Persistence**: Restart app and verify workspace context is maintained

## Implementation Order

1. **Phase 1: Core Workspace Infrastructure**
   - Create workspace manager and image processing modules
   - Add workspace API endpoints (workspace_name now required)
   - Implement automatic workspace initialization on app startup

2. **Phase 2: Required Workspace Integration**
   - Update all generation endpoints to require workspace context
   - Modify API models to make workspace_name mandatory
   - Implement filesystem serving for all image operations

3. **Phase 3: Workspace-First UI**
   - Create workspace picker component (no "No Workspace" option)
   - Add workspace browser modal for project management
   - Update header to always show workspace controls
   - Implement automatic workspace selection (latest or "untitled")

4. **Phase 4: Image Pipeline Integration**
   - Add preview generation and caching system
   - Update timeline and canvas for filesystem-based image serving
   - Hook workspace operations into existing commit/reject system
   - Test image serving performance vs base64

5. **Phase 5: Polish and Validation**
   - Add workspace configuration options
   - Performance optimization for filesystem operations
   - Comprehensive testing of workspace-first workflow

This plan provides a complete workspace system that enhances organization while maintaining backward compatibility and improving performance through efficient image handling.