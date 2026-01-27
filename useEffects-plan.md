## Phase 1: Critical Infrastructure & Core Functionality
*Highest priority - These affect fundamental app operation and must be stable before other changes*

**WebSocket & Real-time Systems:**
- `useWebSocketProgress.ts` – clearing effect races with rapid taskId changes
- `useWebSocketProgress.ts` – subscription effect floods React with renders during message bursts

**Core App Lifecycle:**
- `App.jsx` – canvas refresh key resets unnecessarily on every currentImage change
- `App.jsx` – pendingRestart/ loading loop can cause infinite regeneration cycles

**Canvas Foundation:**
- `useCanvasState.tsx` – auto-fit effect adjusts zoom/pan before image loads
- `useCanvasState.tsx` – view-mode effect toggles unnecessarily during renders
- `useCanvasState.tsx` – preview mask flickers during live previews
- `useCanvasState.tsx` – pointer-lock effect rebuilds listeners causing state conflicts

**Memory & System Monitoring:**
- `StatusBar.jsx` – memory usage polling triggers unnecessary renders

## Phase 2: State Management & Data Integrity
*Second priority - These prevent race conditions and ensure data consistency*

**Async Operation Safety:**
- `TimelineItem.jsx` – metadata fetch lacks cancellation, causes stale data overwrites
- `UpscaleDialog.jsx` – image-load effect doesn't cancel when sourceImage changes
- `WorkspaceBrowser.jsx` – loadStructure() mutates state after unmount
- `WorkspaceBrowser.jsx` – loadStructure() fetches without cancellation
- `PromptComposer/store.ts` – store subscription updates unmounted components

**State Synchronization:**
- `PromptComposer.tsx` – initialData effect races with user edits during workspace swaps
- `UpscaleDialog.jsx` – selectedUpscaler effect overrides user changes on re-renders
- `UpscaleDialog.jsx` – availableUpscalers effect reloads selection mid-workflow
- `PromptComposer.tsx` – nodes.length effect forces default tag, prevents empty states

**Drawing/Canvas State:**
- `useDrawing.tsx` – inputImage effect floods mask history during rapid swaps
- `useDrawing.tsx` – border effects rerun unnecessarily during drawing

## Phase 3: Event Handling & User Interaction
*Third priority - These optimize event processing and user experience*

**Event Handler Optimization:**
- `CanvasArea.jsx` – Alt+wheel handler re-registers listeners on every render
- `CanvasArea.jsx` – cursor-tracking effect never cancels animation frames
- `InpaintCanvas.jsx` – document-level mouse listeners attach on every render
- `InpaintCanvas.jsx` – wheel event effect flickers during live previews
- `NumberSelector.jsx` – wheel handler processes every scroll event
- `InpaintParametersPanel.jsx` – padding wheel handler processes passive scrolling
- `InpaintParametersPanel.jsx` – padding wheel handler (duplicate entry)
- `NumberSelector.jsx` – wheel handler attaches listener on every render

**Keyboard & Shortcut Systems:**
- `useKeyboardShortcuts.tsx` – shortcut effect creates duplicate listeners

**UI State Management:**
- `CanvasArea.jsx` – brush indicator effect rewrites boolean unnecessarily
- `ResolutionIndicator.jsx` – global mousedown listener closes popup redundantly
- `OptionPicker.jsx` – dropdown-position effect recomputes unnecessarily
- `OptionPicker.jsx` – global-close effect processes every click
- `OptionPicker.jsx` – focus-reset effect steals keyboard focus

## Phase 4: Performance & Rendering Optimization
*Lowest priority - These improve efficiency but don't break functionality*

**Render Optimization:**
- `Sidebar.jsx` – canvas-dimension effect mutates state for same image
- `TagComponent.tsx` – inputValue sync effect writes unchanged values
- `TextNodeContent.tsx` – height adjustment causes layout thrashing during typing

**Resource Management:**
- `useMemoryUsage` – polls memory even when unchanged (duplicate of Phase 1)