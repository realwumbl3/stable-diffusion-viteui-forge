# Timeline Feature Implementation Plan

## Overview
This document outlines the plan to implement a working timeline feature in the sidebar of the Stable Diffusion Vite UI. The timeline provides a visual history of generations, allowing users to preview, commit, and manage inpaint/img2img results efficiently.

## Feature Requirements

### Core Components (in sidebar)
1. **[Generation Results Queue]** - New inpaint/img2img results appear here first
2. **[Canvas Preview Area]** - Current working image, shows previewed generations
3. **[Committed Timeline]** - History of accepted generations
4. **[Discarded Generations]** - Rejected results storage

### User Workflow
- **Generation Arrival**: New images appear at top of Generation Results Queue
- **Preview**: Click any generation to preview it in the Canvas area (mask visibility automatically toggled off)
- **Commit**: Use spacer button to commit previewed image to canvas (moves current canvas image to timeline)
- **Bulk Discard on Commit**: When committing, ALL other previewed images in queue are automatically sent to discarded
- **Reject**: Send current preview to discarded pile
- **Upload Integration**: Images added via upload/drag-drop automatically appear in committed timeline

### Key Behavioral Requirements
- **Canvas Data Push**: Committing a preview pushes the image data to canvas so workflow can proceed with the committed image
- **Workflow Progression**: Only one generation path active at a time - committing clears all other pending previews
- **Timeline Continuity**: Previous canvas state is preserved in committed timeline before new image takes its place

## Implementation Plan

### Phase 1: Core Timeline Data Structure & State Management

#### 1.1 Add Timeline State to App
**File**: `client/src/App.jsx`
- Add new state management for timeline:
```javascript
const [timeline, setTimeline] = useState({
  generationQueue: [], // Array of {id, image, timestamp, type: 'inpaint'|'img2img'}
  currentPreview: null, // Currently previewed generation (not committed)
  committedHistory: [], // Array of committed images with timestamps
  discarded: [] // Array of rejected generations
});
```

#### 1.2 Timeline Item Structure
Each timeline item should contain:
- `id`: Unique identifier
- `image`: Base64 image data
- `timestamp`: Generation time
- `type`: 'inpaint' | 'img2img'
- `prompt`: Original prompt (optional, for reference)
- `parameters`: Generation parameters (optional)

### Phase 2: Sidebar Timeline Component

#### 2.1 Create TimelineSidebar Component
**New File**: `client/src/components/TimelineSidebar.jsx`
- Main container component
- Sections: Generation Queue, Canvas Preview, Committed Timeline, Discarded
- Handle item clicks, commits, rejections

#### 2.2 Generation Results Queue Section
- Displays newest generations at top
- Thumbnail grid/list view
- Click handler to set as current preview
- Visual indicator for unviewed items

#### 2.3 Canvas Preview Section
- Shows current working image or previewed generation
- Commit/Reject buttons in spacer area
- Visual distinction when showing preview vs committed

#### 2.4 Committed Timeline Section
- Chronological history of accepted images
- Scrollable list with thumbnails
- Click to preview (non-committing)

#### 2.5 Discarded Generations Section
- Collapsible section for rejected results
- Option to restore from discarded
- Auto-cleanup after certain count/size limit

### Phase 3: Integration with Generation Flow

#### 3.1 Modify Generation Handler
**File**: `client/src/App.jsx`
- Update `handleGenerationComplete()` to add results to timeline queue instead of directly to canvas
- Add new images to `timeline.generationQueue`
- Auto-preview newest generation when queue was empty

#### 3.2 Canvas Integration & Upload Handling
**File**: `client/src/components/Canvas.jsx`
- Add preview mode support with mask visibility automatically toggled off
- Show previewed image with visual overlay indicating "preview mode"
- Commit action moves preview to canvas and current canvas to timeline
- **Upload/Drag-drop Integration**: When image is added via upload or drag-and-drop, automatically add it to `committedHistory` timeline

#### 3.3 API Response Handling
- Ensure generation responses include metadata (type, timestamp, etc.)
- Queue management: auto-preview newest result when no current preview exists

#### 3.4 Commit Behavior Enhancement
- **Bulk Discard on Commit**: When committing a previewed generation, move ALL remaining items in `generationQueue` to `discarded` array
- This ensures clean workflow progression - only one generation path at a time

### Phase 4: Timeline Actions & Controls

#### 4.1 Commit Action
- Button in spacer between generations and canvas
- Moves `currentPreview` to canvas (pushes image data so workflow can proceed with the committed image)
- Moves current canvas image to `committedHistory`
- **Bulk Discard**: Moves ALL remaining items in `generationQueue` to `discarded` array
- Clears `currentPreview`

#### 4.2 Reject Action
- Moves `currentPreview` to `discarded` array
- Clears `currentPreview`
- Option to reject from queue without previewing

#### 4.3 Timeline Navigation
- Click any committed image to preview (without committing)
- Double-click to commit directly
- Keyboard shortcuts for commit/reject

#### 4.4 Timeline Management
- Clear timeline (with confirmation)
- Export timeline as sequence
- Save/load timeline state

### Phase 5: UI/UX Polish

#### 5.1 Visual Design
- Consistent thumbnail sizing
- Smooth animations for item movement
- Visual feedback for different states (preview, committed, discarded)
- Responsive design for sidebar width

#### 5.2 Interaction Feedback
- Hover effects on timeline items
- Loading states for image operations
- Confirmation dialogs for destructive actions
- Toast notifications for actions

#### 5.3 Performance Optimization
- Lazy loading for timeline thumbnails
- Image compression for storage
- Memory management for large timelines
- Virtual scrolling for long histories

## Technical Implementation Details

### State Management Architecture
```javascript
// Timeline state structure
{
  generationQueue: [
    { id: 'gen_123', image: 'base64...', timestamp: Date.now(), type: 'inpaint' }
  ],
  currentPreview: { id: 'gen_122', image: 'base64...', ... },
  committedHistory: [
    { id: 'gen_121', image: 'base64...', committedAt: Date.now(), ... }
  ],
  discarded: [
    { id: 'gen_120', image: 'base64...', discardedAt: Date.now(), ... }
  ]
}
```

### Component Hierarchy
```
TimelineSidebar
├── GenerationQueue
│   └── TimelineItem
├── CanvasSpacer
│   ├── CommitButton
│   └── RejectButton
├── Canvas
├── CommittedTimeline
│   └── TimelineItem
└── DiscardedSection (collapsible)
    └── TimelineItem
```

### Key Integration Points
- **App.jsx**: Timeline state, generation result handling
- **Canvas.jsx**: Preview mode, commit/reject actions
- **Sidebar.jsx**: Timeline component placement
- **api.js**: Metadata inclusion in responses

## File Structure Changes

```
client/src/
├── components/
│   ├── Sidebar.jsx (modify - add timeline section)
│   ├── TimelineSidebar.jsx (new)
│   ├── TimelineItem.jsx (new)
│   └── Canvas.jsx (modify - add preview mode)
├── App.jsx (modify - timeline state & handlers)
└── api.js (modify - add metadata to responses)
```

## Testing Checklist

- [ ] Timeline appears in sidebar
- [ ] New generations appear in queue
- [ ] Clicking generations shows preview in canvas, with mask visibility toggled off
- [ ] Commit button moves previewed image to canvas, current canvas image to timeline
- [ ] When committing a generation, all other previewed images are sent to discarded section
- [ ] Reject button moves preview to discarded
- [ ] Committed timeline shows chronological history
- [ ] Discarded section stores rejected images
- [ ] Preview mode visually distinct from committed
- [ ] Keyboard shortcuts work
- [ ] Canvas should always appear in the timeline, even if no image is currently in the canvas.