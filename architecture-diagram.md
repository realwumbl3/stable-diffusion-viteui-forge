# ViteUI App Architecture Diagram

This document diagrams the complete component wiring and data flow in the ViteUI application, focusing on how components, props, hooks, and contexts are connected together.

## Overview

The app follows a hierarchical component structure with multiple layers of state management through React Context, custom hooks, and prop drilling. The main workflow centers around image generation with different modes (txt2img, img2img, inpaint).

## Root Application Structure

```
React.StrictMode
└── WorkspaceProvider (Context Provider)
    └── App (Main Application)
        ├── Header (Global controls & workspace tabs)
        ├── Workspace (Per-workspace container)
        │   └── CanvasSyncProvider (Context Provider)
        │       ├── Sidebar (Timeline & navigation)
        │       ├── InpaintCanvas (Main canvas interface)
        │       │   ├── CanvasArea (Canvas rendering & interaction)
        │       │   ├── InpaintToolbar (Drawing tools)
        │       │   ├── InpaintParametersPanel (Mask settings)
        │       │   ├── ZoomToolbar (Zoom controls)
        │       │   ├── FullResBorderOverlay (Full-res preview overlay)
        │       │   ├── GenerationControlls (Generation controls)
        │       │   ├── PromptComposer (Prompt editing)
        │       │   │   ├── PromptControls (Composer controls)
        │       │   │   ├── NodeField (Node editor)
        │       │   │   ├── NodeComponent (Node renderer)
        │       │   │   └── TagComponent (Tag input)
        │       │   └── StatusBar (Progress/status display)
        │       └── PropertiesPanel (Generation settings)
        └── WorkspaceBrowser (Workspace selector)
```

## Complete Component Inventory

### Main Application Components
- **App.tsx**: Root component, manages workspace switching and global state
- **Header.tsx**: Top toolbar with model/sampler selection and workspace tabs
- **Workspace.tsx**: Individual workspace container with sidebar and canvas
- **WorkspaceBrowser.tsx**: Modal for selecting/creating workspaces
- **Welcome.tsx**: Welcome screen for new users

### Canvas & Drawing Components
- **InpaintCanvas.tsx**: Main canvas container component
- **CanvasArea.tsx**: Canvas rendering and interaction surface
- **InpaintToolbar.tsx**: Drawing tool selection (brush, erase, undo/redo)
- **Img2ImgToolbar.tsx**: Image-to-image specific controls
- **InpaintParametersPanel.tsx**: Mask and inpainting parameter controls
- **ZoomToolbar.tsx**: Zoom and pan controls
- **FullResBorderOverlay.tsx**: Full-resolution preview overlay
- **GenerationControlls.tsx**: Generation start/stop controls
- **StatusBar.tsx**: Progress and status display

### UI Components
- **Sidebar.tsx**: Timeline browser and generation history
- **PropertiesPanel.tsx**: Generation parameters panel
- **TimelineItem.tsx**: Individual timeline entry
- **GenerationsNavigator.tsx**: Timeline navigation controls
- **MemoryPanel.tsx**: Memory usage display
- **KeyIndicator.tsx**: Keyboard shortcut hints

### Form & Input Components
- **ImageUploader.tsx**: Drag/drop image upload interface
- **NumberSelector.tsx**: Numeric input with validation
- **OptionPicker.tsx**: Dropdown selection component
- **ResolutionPicker.tsx**: Width/height selection with presets
- **ResolutionIndicator.tsx**: Current resolution display
- **UpscaleDialog.tsx**: Upscaling options modal

### Prompt Composer Components
- **PromptComposer.tsx**: Main prompt editing interface
- **PromptControls.tsx**: Composer toolbar and mode switching
- **NodeField.tsx**: Individual node editor
- **NodeComponent.tsx**: Node renderer and interaction
- **TagComponent.tsx**: Tag input component

### Node Content Components (PromptComposer)
- **TextNodeContent.tsx**: Text input for prompts
- **TagsNodeContent.tsx**: Tag-based prompt input
- **BreakNodeContent.tsx**: Section break node
- **GroupNodeContent.tsx**: Grouped node container

### Dialog Components
- **CreateWorkspaceDialog.tsx**: Workspace creation modal
- **UpscaleDialog.tsx**: Image upscaling options

### Utility Components
- **WorkspaceTabs.tsx**: Tab navigation for open workspaces

## Context Providers & State Management

### WorkspaceProvider (WorkspaceContext.tsx)
**Purpose**: Manages workspace-level state across multiple workspace tabs

**State Structure**:
```typescript
WorkspaceState = {
  generation: WorkspaceGenerationState,    // Model, sampler, dimensions, etc.
  mode: WorkspaceModeState,                // Generation mode, masks, inpaint settings
  ui: WorkspaceUiState,                    // UI toggles, prompt mode
  canvas: WorkspaceCanvasState             // Current image, refresh keys
}
```

**Context Value**:
- `openWorkspaces[]`: Active workspace IDs
- `currentWorkspace`: Currently active workspace ID
- `workspaceStates{}`: State for each workspace
- `updateWorkspaceState()`: State updater function
- `models[]`, `samplers[]`: Available models/samplers
- `workspaceBrowserOpen`: Browser modal state

**Hooks**:
- `useWorkspaceContext()`: Access full context
- `useWorkspaceState(workspaceId)`: Access specific workspace state

### CanvasSyncProvider (CanvasSyncContext.tsx)
**Purpose**: Synchronizes canvas-specific state (zoom, pan, brush settings) across components

**State Structure**:
```typescript
CanvasSyncState = {
  zoom, panOffset, fitToScreen,      // Canvas transformation
  showGrid, showMask, showBorder,    // Canvas overlays
  brushSize, drawingMode,            // Drawing parameters
  brushHardness, fillTarget,         // Advanced drawing settings
  fillTolerance, fillOverfill        // Fill tool settings
}
```

**Context Value**: All state properties + setter functions

**Hooks**:
- `useCanvasSync()`: Access full canvas sync state
- `useCanvasSyncSelector(selector)`: Selective state access

## Component Data Flow

### App Component (Root)

**Context Usage**:
- `useWorkspaceContext()`: workspaces, models, samplers

**State Management**:
- `useWorkspaceState(currentWorkspace)`: active workspace state
- `useTitleIconAnimation()`: title icon animation
- Local: revealHotkeys, recentWorkspaceIds

**Child Components**:
- **Header**: workspace management, model/sampler selection
- **Workspace**: individual workspace (multiple instances)
- **WorkspaceBrowser**: workspace selector modal

### Header Component

**Props**: workspaces, current workspace, models/samplers, callbacks

**Child Components**:
- **WorkspaceTabs**: tab navigation
- **OptionPicker**: model/sampler selection
- **NumberSelector**: cfg scale control

### Workspace Component (Per-workspace Container)

**Props**: `{ workspaceId, isActive }`

**Context Providers**:
- **CanvasSyncProvider**: wraps canvas-related components

**State Sources**:
- `useWorkspaceState(workspaceId)`: workspaceState (generation/mode/ui/canvas)
- `useWorkspaceContext()`: models/samplers
- `useWebSocketProgress(taskId)`: progress/livePreview

**Child Components**:
- **Sidebar**: timeline, navigation, generation history
- **InpaintCanvas**: main canvas interface (70+ props)
- **PropertiesPanel**: generation parameters

### Sidebar Component

**Props**: timeline, currentImage, generation history, callbacks

**State**: committedPage, discardedPage, canvasDimensions

**Child Components**:
- **TimelineItem**: individual generation entries
- **KeyIndicator**: keyboard shortcut hints

### InpaintCanvas Component (Main Canvas Interface)

**Props** (70+ props from Workspace):
```typescript
InpaintCanvasProps = {
  // Images & display
  currentImage, previewImage, inputImage, livePreview, previewMaskSnapshot

  // Generation settings
  generationWidth, generationHeight, generationMode, composerNodes

  // Inpaint parameters
  maskBlur, setMaskBlur, inpaintingFill, denoisingStrength, inpaintFullRes...

  // State management
  setInpaintMask, onImageUpload, onRegisterMaskSnapshotProvider

  // UI state
  loading, progress, canvasRefreshKey, canvasControls, footerCollapsed
}
```

**Internal Hooks**:
- `useDrawing()`: mask drawing logic, undo/redo, mask export
- `useFileHandling()`: drag/drop, file selection
- `useKeyboardShortcuts()`: keyboard shortcuts for tools
- `useCanvasPointerEvents()`: mouse/pointer event handling

**Refs**: canvasRef, maskCanvasRef, imageRef, panTargetRef

**Child Components**:
- **CanvasArea**: canvas rendering + interaction (50+ props)
- **InpaintToolbar**: drawing tools (clear/undo/redo)
- **Img2ImgToolbar**: img2img controls
- **InpaintParametersPanel**: mask settings
- **ZoomToolbar**: zoom controls
- **FullResBorderOverlay**: full-res preview overlay
- **GenerationControlls**: generation controls
- **PromptComposer**: prompt editing
- **StatusBar**: progress display

### CanvasArea Component (Canvas Rendering & Interaction)

**Props** (50+ props from InpaintCanvas):
```typescript
CanvasAreaProps = {
  // Canvas refs
  canvasRef, panTargetRef, maskCanvasRef, imageRef

  // Images
  displayImage, inputImage, previewImage, previewMaskSnapshot, livePreview

  // Canvas state
  isPanning, isRightClickPanning, loading, progress

  // Zoom/pan controls
  handleZoomOut, handleZoomIn, handleResetZoom, handleFitToScreen

  // Drawing state
  isDrawing, setLastDrawPos, isDragOver

  // Event handlers
  handleMouseDown, handleMouseMove, handleMouseUp, handleDragOver...

  // Inpaint parameters (30+ props)
  maskBlur, setMaskBlur, inpaintingFill, setInpaintingFill...
}
```

**Context Usage**:
- `useCanvasSync()`: zoom, panOffset, brushSize, drawingMode, showMask, etc.

**Child Components**:
- **ZoomToolbar**: zoom controls
- **InpaintParametersPanel**: mask settings
- **FullResBorderOverlay**: full-res preview overlay

### PromptComposer Component (Complex Prompt Editor)

**Props**: initialData, onNodesChange, mode, onModeChange, collapsed, onToggle

**Internal State**: nodes, selectedNodeId, editingNodeId, dragState

**Child Components**:
- **PromptControls**: toolbar and mode switching
- **NodeField**: individual node editors
- **NodeComponent**: node renderers

### PropertiesPanel Component (Generation Settings)

**Props**: generation settings, callbacks

**Child Components**:
- **ResolutionPicker**: width/height controls
- **NumberSelector**: parameter controls

### WorkspaceBrowser Component

**Props**: currentWorkspace, onSelectWorkspace, onClose

**Features**: workspace listing, creation, selection

## Hook Architecture

### Core Application Hooks

#### useWorkspaceTabs (hooks/useWorkspaceTabs.ts)
**Purpose**: Manages workspace tab state and persistence

**Returns**:
```typescript
{
  openWorkspaces[], currentWorkspace, openWorkspace(), closeWorkspace(),
  switchWorkspace(), closeAllWorkspaces()
}
```

**State**: Persisted to localStorage

#### useWebSocketProgress (hooks/useWebSocketProgress.ts)
**Purpose**: Manages WebSocket connection for generation progress updates

**Parameters**: `taskId` (string | null)

**Returns**:
```typescript
{
  progress: ProgressData | null, isConnected: boolean,
  livePreview: string | null, disconnect()
}
```

**Features**: Auto-reconnection, ping/pong, progress state management

#### useTitleIconAnimation (hooks/useTitleIconAnimation.ts)
**Purpose**: Animates the browser title icon during generation

**Parameters**: `isLoading` (boolean)

**Returns**: None (side effect only)

#### useKeyboardShortcuts (hooks/useKeyboardShortcuts.ts)
**Purpose**: Global keyboard shortcuts for canvas operations

**Parameters**: Canvas state + callback functions

**Returns**: None (sets up event listeners)

### Canvas-Specific Hooks

#### useDrawing (InpaintCanvas/hooks/useDrawing.tsx)
**Purpose**: Manages mask drawing operations and history

**Parameters**:
```typescript
UseDrawingParams = {
  inputImage, setInpaintMask, imageRef, maskCanvasRef,
  brushSize, drawingMode, brushHardness, fillTarget, fillTolerance,
  generationWidth, generationHeight, workspaceId
}
```

**Returns**:
```typescript
{
  getCroppedMaskSnapshot, getMaskDataUrl, clearMask, undoMask, redoMask,
  saveMaskState, getCanvasCoordinates, drawBrush, fillAtPoint,
  focusBounds, maskBounds, canUndo, canRedo
}
```

**State Management**: Uses WorkspaceTransientState for history persistence

#### useCanvasPointerEvents (InpaintCanvas/hooks/useCanvasPointerEvents.tsx)
**Purpose**: Handles mouse/pointer events for panning and drawing

**Parameters**:
```typescript
CanvasPointerEventsArgs = {
  panTargetRef, canvasState (panOffset, drawing state, setters),
  drawing (drawing methods), inputImage, generationMode, drawingMode
}
```

**Returns**: Event handler functions (handleMouseDown, handleMouseMove, etc.)

#### useFileHandling (InpaintCanvas/hooks/useFileHandling.tsx)
**Purpose**: Manages file upload operations

**Parameters**: `{ onImageUpload }`

**Returns**:
```typescript
{
  isDragOver, fileInputRef, openFileDialog,
  handleDragOver, handleDragLeave, handleDrop
}
```

### PromptComposer Hooks

#### usePromptComposerStore (PromptComposer/store.ts)
**Purpose**: Internal state management for prompt composer

**Features**: Node manipulation, undo/redo, validation

### Utility Hooks

#### useWorkspaceContext (contexts/WorkspaceContext.tsx)
**Purpose**: Access workspace context from any component

**Returns**: Full WorkspaceContextValue

#### useWorkspaceState (contexts/WorkspaceContext.tsx)
**Purpose**: Access specific workspace state

**Parameters**: `workspaceId` (string | null)

**Returns**: `{ workspaceState, updateWorkspaceState }`

#### useCanvasSync (contexts/CanvasSyncContext.tsx)
**Purpose**: Access canvas synchronization state

**Returns**: Full CanvasSyncContextValue

#### useCanvasSyncSelector (contexts/CanvasSyncContext.tsx)
**Purpose**: Selective access to canvas state

**Parameters**: `selector` function

**Returns**: Selected state value

## State Flow Patterns

### 1. Workspace State (Persistent)
- Managed by WorkspaceProvider
- Persisted to localStorage via WorkspaceContext
- Updated via `updateWorkspaceState()`
- Flows down through props to components
- Survives page refreshes and browser sessions

### 2. Canvas Sync State (Ephemeral)
- Managed by CanvasSyncProvider
- Lost on page refresh
- Updated via context setters
- Shared across canvas-related components
- Synchronized between multiple canvas components

### 3. Transient State (Per-workspace)
- Canvas elements, mask history, undo/redo stacks
- Managed by WorkspaceProvider
- Persisted per workspace but not to localStorage
- Accessed via `ensureWorkspaceTransientState()`
- Survives workspace switches but lost on page refresh

### 4. Local Component State
- UI visibility, drag states, form inputs
- Managed locally in components with useState
- Not shared between components
- Lost on component unmount

### 5. WebSocket State (Real-time)
- Generation progress, live previews
- Managed by useWebSocketProgress hook
- Global WebSocket manager instance
- Auto-reconnection and state synchronization

### 6. URL/DOM State
- Image URLs, canvas dimensions
- Derived from props and DOM measurements
- Cached and transformed as needed

## Data Flow Direction

### Downward (Props) - State Distribution
```
WorkspaceProvider → Workspace → InpaintCanvas → CanvasArea → Child Components
                    ↓
               useCanvasSync → CanvasArea, InpaintParametersPanel, ZoomToolbar
                    ↓
           useWorkspaceContext → Header, App, WorkspaceBrowser
```

### Upward (Callbacks) - Event Bubbling
```
Child Components → CanvasArea → InpaintCanvas → Workspace → WorkspaceProvider
      ↓                ↓             ↓             ↓
   UI Events      Drawing Events  Generation    State Updates
```

### Horizontal (Context) - Cross-Component Communication
```
CanvasSyncProvider ↔ CanvasArea, InpaintParametersPanel, ZoomToolbar, InpaintToolbar
WorkspaceProvider ↔ App, Header, Workspace, Sidebar, PropertiesPanel
```

### Real-time (WebSocket) - Live Updates
```
WebSocket Server → useWebSocketProgress → Workspace → InpaintCanvas → StatusBar
                                                    ↓
                                               CanvasArea (live preview overlay)
```

## Event Handling Chain

### Mouse/Pointer Events (Drawing & Navigation)
```
DOM Event → useCanvasPointerEvents → CanvasArea → InpaintCanvas
                                      ↓              ↓
                                 UI Updates    useDrawing (mask operations)
                                      ↓              ↓
                              Context Updates   State Updates
```

### Keyboard Shortcuts (Global Actions)
```
DOM Event → useKeyboardShortcuts → Canvas sync state updates
                                      ↓
                                 UI updates via context
                                      ↓
                            Canvas re-renders with new settings
```

### WebSocket Progress (Generation Updates)
```
WebSocket Message → useWebSocketProgress → Workspace → InpaintCanvas → CanvasArea
                                                       ↓              ↓
                                                 StatusBar       Live Preview Overlay
                                                       ↓              ↓
                                                 Progress Display  Real-time Image Updates
```

### File Upload Events
```
File Drop/Select → useFileHandling → InpaintCanvas → Workspace → API Call
```

### Timeline Navigation
```
TimelineItem Click → Sidebar → Workspace → State Update → Re-render
```

## Component Communication Patterns

### 1. Props Drilling (Primary Data Flow)
- **Deep prop passing**: Workspace → InpaintCanvas → CanvasArea → child components
- **Used for**: images, generation settings, UI state, event handlers
- **Pattern**: 70+ props from Workspace to InpaintCanvas, 50+ to CanvasArea
- **Trade-off**: Verbose but explicit data dependencies

### 2. Context Sharing (Cross-Component State)
- **CanvasSyncContext**: Shared canvas state (zoom, pan, brush settings)
- **WorkspaceContext**: Global workspace management and models/samplers
- **Usage**: Components subscribe to relevant state slices
- **Performance**: Optimized with useContextSelector where possible

### 3. Callback Props (Event Bubbling)
- **Functions passed down**: handleZoom, onImageUpload, setMaskBlur, etc.
- **Bubble up changes**: Child → Parent → Context update
- **Pattern**: Event handlers flow down, state updates flow up

### 4. Ref Forwarding (DOM Access)
- **Canvas refs**: canvasRef, maskCanvasRef, imageRef for drawing operations
- **DOM manipulation**: Direct canvas access for performance-critical operations
- **Pattern**: Refs created in parent, passed to children for DOM access

### 5. Hook Composition (Logic Encapsulation)
- **useDrawing**: Drawing logic, undo/redo, mask operations
- **useFileHandling**: File upload, drag/drop logic
- **useCanvasPointerEvents**: Mouse/pointer event handling
- **useWebSocketProgress**: WebSocket connection and progress management
- **Pattern**: Hooks encapsulate complex logic, return data + callbacks

### 6. Custom Events (Component Coordination)
- **Mask snapshot registration**: InpaintCanvas registers callbacks with Workspace
- **Timeline updates**: Sidebar communicates with Workspace for history management
- **Workspace switching**: Header coordinates with App for workspace management

### 7. State Synchronization (Multi-Source Updates)
- **Workspace state**: Updated via multiple paths (UI changes, API responses)
- **Canvas sync**: Coordinated updates across multiple canvas components
- **WebSocket state**: Real-time updates merged with local state

## Key Data Transformations

### Image Processing Pipeline
```
Raw image ID → resolveImageSrc() → Full URL with workspace/timestamp parameters
                      ↓
              Image load → Natural dimensions → Canvas sizing calculations
                      ↓
              Canvas rendering → Zoom/pan transforms → Display coordinates
```

### Canvas Coordinate System
```
Mouse event (screen) → getCanvasCoordinates() → Canvas-relative coordinates
                            ↓
                    Drawing operations → Mask canvas updates → Base64 export
                            ↓
                    setInpaintMask() → Workspace state → API submission
```

### Mask Data Flow
```
Canvas drawing → getMaskDataUrl() → Base64 encoded PNG
                      ↓
              Cropped mask snapshot → Full-resolution mask generation
                      ↓
              API submission → Backend processing → Result generation
```

### Progress Data Pipeline
```
WebSocket message → useWebSocketProgress → Normalized Progress object
                      ↓
              UI display values → StatusBar updates → Live preview overlays
                      ↓
              Completion handling → State cleanup → Timeline updates
```

### Prompt Processing
```
Composer nodes → composePromptsFromNodes() → Positive/negative prompts
                      ↓
              Legacy encoding → API format → Backend processing
                      ↓
              Generation parameters → Image generation → Result storage
```

## API Integration Points

### Backend API (Api.ts)
- **Workspace Management**: create/list/delete workspaces
- **Image Generation**: txt2img, img2img, inpaint endpoints
- **Model Management**: list/set active models and samplers
- **Timeline**: generation history and management

### WebSocket API (useWebSocketProgress)
- **Progress Updates**: Real-time generation progress
- **Live Previews**: Streaming image updates during generation
- **Completion Events**: Generation finished notifications

### File System Integration
- **Image Upload**: Drag/drop and file selection
- **Workspace Persistence**: localStorage for state management
- **Export Operations**: Canvas-to-image conversions

## Performance Optimizations

### Rendering Optimizations
- **Canvas-based drawing**: Hardware-accelerated mask operations
- **RequestAnimationFrame**: Smooth brush indicator updates
- **Memoized calculations**: Canvas sizing and coordinate transforms

### State Management Optimizations
- **Context selectors**: Targeted re-renders for context changes
- **Debounced updates**: Reduced frequency of expensive operations
- **Transient state**: Per-workspace caching of expensive resources

### Memory Management
- **Canvas pooling**: Reuse canvas elements across operations
- **Image cleanup**: Proper disposal of blob URLs and canvas contexts
- **History limits**: Bounded undo/redo stacks to prevent memory leaks

This architecture enables a complex image editing and generation interface with proper separation of concerns, state management, and component communication patterns. The modular design allows for independent development of features while maintaining consistent data flow and user experience.