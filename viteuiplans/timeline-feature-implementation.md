# Timeline Feature Implementation Plan

## Overview
This document outlines the plan to implement a comprehensive timeline feature in the sidebar of the Vite React Stable Diffusion client. The timeline will provide a visual history of image generations, allowing users to preview, commit, and discard generated images while maintaining a clear workflow state. This feature will enhance the iterative image creation process by providing better organization and control over the generation history.

## Current State Analysis

### Backend (Generation History)
- **API Integration**: Existing `/sdapi/v1/img2img` and `/sdapi/v1/txt2img` endpoints return generated images
- **WebSocket Progress**: Real-time generation progress via WebSocket connection
- **No persistent history**: Currently no server-side storage of generation history
- **Image Storage**: Generated images are stored in `outputs/` directory structure

### Frontend (Current State)
- **Sidebar Component**: Basic sidebar exists (`client/src/components/Sidebar.jsx`)
- **Canvas Component**: Displays current working image with zoom/pan capabilities
- **Generation Flow**: Basic generate → display workflow
- **No history management**: No tracking of previous generations or workflow state
- **State Management**: Limited image state tracking in App component

## Implementation Plan

### Phase 1: Core Timeline State Management

#### 1.1 Timeline State Architecture
**File**: `client/src/App.jsx`
- Add comprehensive timeline state management:
  ```javascript
  timeline: {
    generations: [], // New/pending generations at top
    canvas: null,    // Current working image
    history: [],     // Committed images timeline
    discarded: []    // Rejected generations
  }
  ```
- Define timeline item structure:
  ```javascript
  {
    id: string,           // Unique identifier
    image: base64,        // Image data
    timestamp: Date,      // Creation time
    type: 'generation'|'committed'|'discarded',
    metadata: {           // Generation parameters
      prompt: string,
      negativePrompt: string,
      mode: 'txt2img'|'img2img'|'inpaint',
      // ... other params
    }
  }
  ```

#### 1.2 Timeline Actions & Reducers
**New File**: `client/src/hooks/useTimeline.js`
- Custom hook for timeline operations:
  - `addGeneration(image, metadata)` - Add new generation to top
  - `previewGeneration(id)` - Preview generation in canvas
  - `commitToCanvas(id)` - Commit previewed image, move canvas to history
  - `discardGeneration(id)` - Move generation to discarded
  - `restoreFromHistory(id)` - Restore image from history to canvas
  - `clearDiscarded()` - Clear discarded generations

#### 1.3 WebSocket Integration
**File**: `client/src/hooks/useWebSocket.js`
- Extend WebSocket hook to handle timeline updates:
  - Auto-add completed generations to timeline
  - Update generation status (pending → complete)
  - Handle batch generation results

### Phase 2: Timeline Sidebar Component

#### 2.1 Timeline Component Structure
**New File**: `client/src/components/Timeline/Timeline.jsx`
- Main timeline container component
- Four distinct sections:
  - **Generations Section**: New/pending images
  - **Canvas Preview Section**: Current working image
  - **History Section**: Committed timeline
  - **Discarded Section**: Rejected images

#### 2.2 Timeline Item Components
**New File**: `client/src/components/Timeline/TimelineItem.jsx`
- Reusable component for timeline entries
- Features:
  - Thumbnail preview
  - Click to preview in canvas
  - Context menu for actions (commit, discard, delete)
  - Metadata display (timestamp, generation mode)
  - Drag & drop support (future enhancement)

#### 2.3 Timeline Sections
**New Files**:
- `client/src/components/Timeline/GenerationsSection.jsx`
- `client/src/components/Timeline/CanvasSection.jsx`
- `client/src/components/Timeline/HistorySection.jsx`
- `client/src/components/Timeline/DiscardedSection.jsx`

Each section will have:
- Section header with count/title
- Scrollable list of timeline items
- Section-specific actions

#### 2.4 Commit Spacer Component
**New File**: `client/src/components/Timeline/CommitSpacer.jsx`
- Visual separator between Generations and Canvas sections
- "Commit to Canvas" button
- Drag target for committing generations
- Visual feedback during drag operations

### Phase 3: Canvas Integration

#### 3.1 Canvas Preview System
**File**: `client/src/components/Canvas.jsx`
- Add preview mode state
- Distinguish between "working" and "preview" modes
- Overlay indicators for preview vs working state
- Seamless switching between preview and working images

#### 3.2 Canvas State Synchronization
- Update canvas when timeline preview changes
- Maintain zoom/pan state during preview switches
- Preserve canvas tools state across previews
- Handle canvas operations on preview images (read-only mode)

### Phase 4: Timeline Persistence

#### 4.1 Local Storage Integration
**New File**: `client/src/hooks/useTimelinePersistence.js`
- Save timeline state to localStorage
- Restore timeline on app reload
- Handle large image data efficiently (compression/throttling)
- Session management (clear on new session vs persist across sessions)

#### 4.2 Image Storage Optimization
- Compress base64 images for storage
- Implement LRU cache for timeline images
- Handle memory limits gracefully
- Option to save timeline to disk (future)

### Phase 5: UI/UX Enhancements

#### 5.1 Timeline Controls
**New File**: `client/src/components/Timeline/TimelineControls.jsx`
- Expand/collapse sections
- Filter options (show only recent, by type, etc.)
- Search within timeline
- Bulk operations (clear discarded, export timeline)

#### 5.2 Visual Design
**File**: `client/src/components/Timeline/Timeline.css`
- Clean, modern design matching app theme
- Smooth animations for item transitions
- Visual hierarchy for different sections
- Responsive design for sidebar width adjustments
- Dark/light theme support

#### 5.3 Keyboard Shortcuts
**File**: `client/src/hooks/useKeyboardShortcuts.js`
- Extend existing shortcuts:
  - `Ctrl+Enter`: Commit current preview to canvas
  - `Delete`: Discard selected generation
  - `Ctrl+Z`: Undo last timeline action
  - `Ctrl+Y`: Redo timeline action

#### 5.4 Context Menus
**New File**: `client/src/components/Timeline/TimelineContextMenu.jsx`
- Right-click menu on timeline items
- Actions: Preview, Commit, Discard, Copy to Clipboard, Save to Disk
- Keyboard navigation support

## Technical Implementation Details

### Timeline Data Flow
```javascript
// Generation completes
WebSocket → useTimeline.addGeneration() → update generations[]
         ↓
// User clicks generation
TimelineItem.onClick → useTimeline.previewGeneration() → update canvas
         ↓
// User commits
CommitSpacer.onClick → useTimeline.commitToCanvas() → canvas → history[], new canvas
         ↓
// User discards
TimelineItem.discard → useTimeline.discardGeneration() → generations[] → discarded[]
```

### Component Hierarchy
```
Sidebar
├── Timeline
    ├── GenerationsSection
    │   ├── TimelineItem
    │   └── TimelineItem
    ├── CommitSpacer
    ├── CanvasSection
    │   └── CanvasPreview
    ├── HistorySection
    │   ├── TimelineItem
    │   └── TimelineItem
    └── DiscardedSection
        ├── TimelineItem
        └── TimelineControls
```

### State Management Architecture
```javascript
const timelineState = {
  generations: [
    { id: 'gen_1', image: '...', status: 'previewing', ... }
  ],
  canvas: { id: 'canvas_1', image: '...', ... },
  history: [
    { id: 'hist_1', image: '...', committedAt: timestamp, ... }
  ],
  discarded: [
    { id: 'disc_1', image: '...', discardedAt: timestamp, ... }
  ],
  selectedId: 'gen_1', // Currently selected/previewed item
  undoStack: [...],    // For undo/redo functionality
}
```

## File Structure

```
client/src/
├── components/
│   ├── Sidebar.jsx (modify)
│   ├── Canvas.jsx (modify)
│   └── Timeline/
│       ├── Timeline.jsx
│       ├── TimelineItem.jsx
│       ├── GenerationsSection.jsx
│       ├── CanvasSection.jsx
│       ├── HistorySection.jsx
│       ├── DiscardedSection.jsx
│       ├── CommitSpacer.jsx
│       ├── TimelineControls.jsx
│       ├── TimelineContextMenu.jsx
│       └── Timeline.css
├── hooks/
│   ├── useTimeline.js
│   ├── useTimelinePersistence.js
│   └── useKeyboardShortcuts.js (modify)
└── App.jsx (modify)
```

## Testing Checklist

- [ ] Timeline initializes correctly on app load
- [ ] New generations appear at top of list
- [ ] Clicking generation previews in canvas
- [ ] Commit spacer commits preview to canvas
- [ ] Committed canvas image moves to history
- [ ] Discard functionality moves to discarded section
- [ ] Timeline state persists across app reloads
- [ ] Keyboard shortcuts work correctly
- [ ] Context menus display and function properly
- [ ] Visual feedback during drag operations
- [ ] Memory usage stays reasonable with many images
- [ ] Responsive design works on different screen sizes
- [ ] Timeline sections expand/collapse properly
- [ ] Search and filter functionality works
- [ ] Undo/redo operations work correctly
- [ ] Error handling for corrupted timeline state

## Backend Changes Required

**Minimal Changes Required:**
- No backend changes needed for core timeline functionality
- Consider adding optional endpoint for timeline persistence if implementing server-side storage
- Existing WebSocket progress updates sufficient for real-time timeline updates

## Migration Notes

- Timeline feature is additive - doesn't affect existing functionality
- Can be enabled/disabled via feature flag
- Existing canvas workflow remains unchanged
- Timeline state initializes empty for new users

## Performance Considerations

- Limit timeline items (e.g., max 50 per section)
- Compress images before storing in localStorage
- Lazy load timeline thumbnails
- Debounce rapid generation updates
- Use virtual scrolling for large timelines
- Optimize canvas switching performance

## Accessibility

- Keyboard navigation through timeline items
- Screen reader support for timeline sections
- High contrast support for timeline items
- Focus management during preview switching
- ARIA labels for interactive elements

## Future Enhancements

1. **Advanced Organization**: Tags, folders, favorites for timeline items
2. **Comparison View**: Side-by-side comparison of timeline items
3. **Timeline Export**: Save timeline as project file
4. **Collaboration**: Share timeline with others
5. **AI Insights**: Generation quality analysis, suggestions
6. **Timeline Search**: Full-text search across prompts/metadata
7. **Batch Operations**: Apply operations to multiple timeline items
8. **Timeline Animation**: Smooth transitions, time-based playback

## Timeline Estimate

- **Phase 1**: 3-4 days (Core state management & architecture)
- **Phase 2**: 4-5 days (Timeline UI components)
- **Phase 3**: 2-3 days (Canvas integration)
- **Phase 4**: 2-3 days (Persistence & optimization)
- **Phase 5**: 2-3 days (UI/UX polish & testing)
- **Total**: ~13-18 days for MVP

## Dependencies

New npm packages to consider:
- `react-beautiful-dnd` or `dnd-kit` for drag & drop (optional)
- `date-fns` for timestamp formatting
- `lz-string` for image compression in localStorage
- `react-virtualized` for large timeline performance (if needed)

## Notes

- Start with core workflow: generate → preview → commit/discard
- Focus on performance with large numbers of images
- Ensure smooth integration with existing canvas tools
- Consider mobile/tablet timeline interaction patterns
- Keep timeline state simple initially, add advanced features iteratively