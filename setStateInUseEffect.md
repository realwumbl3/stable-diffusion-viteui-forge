 # VITE UI

 ## Summary
 - 33 documented `useEffect` hooks below call state setters. Each entry highlights where state is mutated and why the current wiring can be fragile (unbounded async updates, forced resets, event listeners firing off after unmount, etc.).

 ## client/src/App.jsx
 - `useEffect(..., [])` – `loadInitialData()`/`initializeWorkspace()` await APIs and call many setters (`setModels`, `setWorkspaces`, etc.). Because the effect never cancels those async responses, a slow network request can still invoke `setState` after the component unmounts or during StrictMode double renders, triggering warnings and duplicated load work.
 - `useEffect(() => setCanvasRefreshKey(0), [currentImage])` – forcibly resets the refresh key every time `currentImage` changes, even when the key is already zero. This guarantees an extra render and makes any manual refresh adjustments impossible.
 - `useEffect(..., [loading, pendingRestart, composerPrompt])` – as soon as `pendingRestart` flips true it sets it back to `false` and re-runs `generateImage()`. If `generateImage` toggles `pendingRestart`/`loading` in the same render, the effect can bounce and queue multiple generations when the flags shift quickly.

 ## client/src/components/PromptComposer/PromptComposer.tsx
 - `useEffect(..., [initialData, setNodes])` – wipes the local node list whenever `initialData` arrives and uses `setTimeout` to clear the guard flag. Rapid `initialData` swaps can therefore reset user edits repeatedly and may race with preference persistence.
 - `useEffect(..., [nodes.length, setNodes, initialData])` – auto-inserts the default tag whenever `nodes.length` hits zero. During rapid node removals this effect keeps re-adding the placeholder node and can trigger excessive renders.

 ## client/src/components/TimelineItem.jsx
 - `useEffect(..., [item.genid, item.workspace, item.status])` – fetches metadata and calls `setAspectRatio`/`setImageDimensions` when the request resolves. Without cancellation, quick timeline navigation causes stale metadata to overwrite the newly selected card or raises “state update on unmounted component” warnings.

 ## client/src/components/UpscaleDialog.jsx
 - `useEffect(..., [selectedUpscaler])` – copies the prop into local `currentUpscaler` every time it changes, which can override the user’s interim selection if the parent keeps re-rendering the dialog.
 - `useEffect(..., [availableUpscalers])` – pulls the last-used upscaler from `localStorage` whenever the list changes. If the backend refreshes the list while the dialog is open, this effect can unexpectedly flip the selection in the middle of a user action.
 - `useEffect(..., [sourceImage?.image])` – adds a `load` listener and calls `setImageDimensions`. When the image source changes rapidly the listener may still fire and mutate state after the component already switched to a different source.

 ## client/src/components/Sidebar.jsx
 - `useEffect(..., [currentImage])` – installs a `load` handler that calls `setCanvasDimensions` whenever `currentImage` changes (or disappears). Fast swaps trigger repeated state updates and re-renders even when the dimensions remain identical.

 ## client/src/components/InpaintCanvas/hooks/useDrawing.tsx
 - `useEffect(..., [inputImage])` – resizes canvases and writes to mask history through multiple setters every time the input image changes. Because this runs immediately with no abort, sequential image swaps can flood the mask state and apply stale content to the new image.

 ## client/src/components/InpaintCanvas/components/CanvasArea.jsx
 - `useEffect(..., [inputImage, drawingMode, generationMode])` – toggles `setShowBrushIndicator` whenever those props change. The effect runs on every render where those values swing (including intermediate draws) and updates state even if the boolean already matches, causing needless renders.
 - `useEffect(..., [canvasRef, setBrushSize])` – attaches a wheel listener that calls `setBrushSize` for Alt + scroll. Because the listener is tied directly to the DOM and re-registered on every render, it can fire before React cleans up or after unmounting, resulting in stray brush-size updates.

 ## client/src/components/WorkspaceBrowser.jsx
 - `useEffect(..., [])` – calls `loadStructure()` and then `setStructure`/`setExpanded`. The fetch is uncancelled, so closing the browser before the response arrives still triggers those setters and can generate state-update warnings.

 ## client/src/components/InpaintCanvas/components/InpaintParametersPanel.jsx
 - `useEffect(..., [inpaintFullResPadding, setInpaintFullResPadding])` – installs a wheel handler that immediately calls `setInpaintFullResPadding` for every scroll event. Passive scroll gestures therefore mutate padding state even when the user merely intends to scroll the surrounding page.

 ## client/src/components/ResolutionIndicator.jsx
 - `useEffect(..., [isOpen])` – registers a `mousedown` listener that calls `setIsOpen(false)` regardless of what else changed the state. Any concurrent interaction with another component that toggles `isOpen` can race with this listener and leave the indicator stuck open or closed.

 ## client/src/components/InpaintCanvas/components/StatusBar.jsx
 - `useEffect(..., [])` (inside `useMemoryUsage`) – polls `performance.memory.usedJSHeapSize` every 5 seconds and calls `setMemoryUsage` even when the number stays the same. Because React does not dedupe this interval-driven `setState`, it keeps re-rendering the status bar long after the user stops interacting.

 ## client/src/components/PromptComposer/components/TagComponent.tsx
 - `useEffect(..., [tag.value])` – mirrors the prop into `inputValue` and recalculates the width. Redundant `tag.value` deliveries still call `setInputValue`, so long prompt lists may invoke a flurry of renders as the parent repeatedly passes the same strings.

 ## client/src/components/OptionPicker.jsx
 - `useEffect(..., [isOpen, triggerRef])` (`useDropdownPosition`) – recomputes and sets position whenever the dropdown opens or moves, even when the computed top/left do not change, leading to extra renders.
 - `useEffect(..., [])` – globally closes the menu on any document click by running `setIsOpen(false)` and `setFocusedIndex(-1)`. Because this listener fires even when the dropdown is already closed, it still performs a state update on every click anywhere on the page.
 - `useEffect(..., [isOpen, options, value])` – forces `setFocusedIndex` whenever the menu toggles or the options/value change, which can steal focus from keyboard users if the parent also mutates those props in the same render.
 - `useEffect(..., [isOpen, focusedIndex, options, onChange])` – keyboard navigation calls `setFocusedIndex`/`setIsOpen`, but because it wires raw DOM events through `addEventListener`, two fast key presses may trigger overlapping `setState` calls before the `options` array updates.

 ## client/src/hooks/useWebSocketProgress.ts
 - `useEffect(..., [taskId])` (connect effect) – starts/stops the shared manager and updates `setIsConnected`, `setProgress`, and a ping interval. During reconnection storms this effect may execute many times in quick succession, leaving multiple pings and state updates queued.
 - `useEffect(..., [taskId])` (clear effect) – clears `progress`/`livePreview` via `setProgress(null)`/`setLivePreview(null)` when there is no task ID. Rapid toggling of `taskId` can therefore erase fresh progress data moments after it appeared.
 - `useEffect(..., [taskId])` (subscription) – the progress callback calls `setIsConnected`, `setProgress`, and `setLivePreview` for every incoming message. Bursts of websocket traffic can flood React with state updates and re-renders, especially on lower-end clients.

 ## client/src/components/InpaintCanvas/hooks/useCanvasState.tsx
 - `useEffect(..., [displayImage, inputImage, generationWidth, generationHeight, fitToScreen, calculateFitToScreenScale, calculateCenterOffset, livePreview, getDisplayDimensions])` – auto-adjusts zoom/pan by setting `setZoom`/`setPanOffset`. Because it fires before the image settles, the effect often sets state multiple times while waiting for the load event, producing redundant renders.
 - `useEffect(..., [displayImage, inputImage, forceEditMode, livePreview])` – flips `setViewMode` depending on the visible image. When the props flip back/forth rapidly, the view mode can jitter between “edit” and “result”.
 - `useEffect(..., [previewImage])` – immediately hides the mask (`setShowMask(false)`) and later restores it. Every preview frame retriggers this effect, so mask visibility toggles can look like flicker.
 - `useEffect(..., [panType])` – pointer-lock listeners call `setIsPanning`, `setPanType`, and `setIsRightClickPanning`. Frequent pan toggles tear down and recreate those listeners, which occasionally leads to simultaneous state updates from multiple event handlers.

 ## client/src/hooks/useKeyboardShortcuts.ts
 - `useEffect(..., [shortcuts])` – registers a global keydown listener that invokes callbacks (many of which mutate state). Because it only depends on the `shortcuts` object identity and not whether the owner component is still mounted, the listener can fire after cleanup and attempt to update state on an unmounted component.

 ## client/src/components/InpaintCanvas/hooks/useKeyboardShortcuts.tsx
 - `useEffect(..., [brushSize, setBrushSize, brushHardness, setBrushHardness, setDrawingMode, clearMask, undoMask, redoMask])` – registers shortcuts that mutate the brush/canvas state. The effect rebinds on every brush change before the previous listener is fully removed, allowing duplicate handlers to run and compete over the same state updates.

 ## client/src/components/PromptComposer/store.ts
 - `React.useEffect(..., [])` – subscribes to the shared store and calls `setNodes` whenever the module-level store mutates. Because the subscription has no “still mounted?” guard, any update dispatched after the hook unmounts triggers React’s “setState on unmounted component” warning.
