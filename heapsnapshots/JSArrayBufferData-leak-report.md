# JSArrayBufferData Leak Analysis Report

**Snapshot:** `Heap-20260124T173433.heapsnapshot`  
**Target:** `system / JSArrayBufferData`  
**Total:** 112 nodes, **2806.25 MB** self_size

---

## Top retainers (by retained self_size)

| Rank | Type       | Retainer name                                                       | Count | Size (MB) |
|------|------------|---------------------------------------------------------------------|-------|-----------|
| 1    | synthetic  | (Traced handles)                                                    | 21    | 525.00    |
| 2    | object     | Array                                                               | 13    | 325.00    |
| 3    | array      | (object elements)                                                   | 13    | 325.00    |
| 4    | native     | PerformanceEventTiming                                              | 13    | 325.00    |
| 5    | native     | InternalNode                                                        | 7     | 175.00    |
| 6    | native     | SVGPathElement                                                      | 6     | 150.00    |
| 7    | native     | Text                                                                | 4     | 100.00    |
| 8    | native     | SVGSVGElement                                                       | 4     | 100.00    |
| 9    | native     | SVGAnimatedLength                                                   | 4     | 100.00    |
| 10   | array      | (unnamed)                                                           | 3     | 75.00     |
| …    | native     | `<img src="…/full.png" … Image to inpaint">`                        | 1     | 25.00     |
| …    | native     | `<button … Fill>`, `<button … Clear All>`, `<div … pointer-events-none>`, `<div outline outline-red-500>`, `<div outline-dotted outline-green-500>`, etc. | 1 each | 25.00 each |

---

## Suspected leak sources and code cross-references

### 1. PerformanceEventTiming + Array / (object elements) — **~325 MB (13× ~25 MB)**

- **What:** Browser Performance API holds `PerformanceResourceTiming` / `PerformanceEventTiming` for resources (images, XHR, etc.). The same 13 buffers appear under Array, (object elements), and PerformanceEventTiming.
- **Code:** No explicit `performance.getEntries*` or `performance.clearResourceTimings()` in `client/src`. The browser accumulates these automatically for each `img` load, fetch, etc.
- **Recommendation:** Call `performance.clearResourceTimings()` when switching workspaces or after loading workspace images, and/or when the Inpaint view is closed, to release references to decoded image buffers held in timing entries. Consider doing this in `useEffect` cleanup or in workspace tab change handlers in `App.tsx` / `WorkspaceTabs` or wherever workspace or view changes are handled.

### 2. maskHistory (ImageData[]) in useDrawing — **up to ~250 MB (10 × ~25 MB) at 2500×2500**

- **What:** Undo/redo keeps up to 10 `ImageData` copies of the mask canvas. Each `ImageData` holds `width×height×4` bytes. At 2500×2500 that is ~25 MB per slot; at 5000×5000 ~100 MB per slot.
- **Code:** `client/src/components/InpaintCanvas/hooks/useDrawing.tsx`:
  - `useState<ImageData[]>([])` for `maskHistory` (line 46).
  - `saveMaskState` pushes `getImageData(…)` into `maskHistory` (lines 330–339).
  - Cap of 10 (lines 343–348); older entries are shifted out.
- **Recommendation:** Already capped. Consider lowering the cap (e.g. 5) for very large canvases, or downscaling history to a smaller resolution. On Inpaint unmount or when switching input image, ensure `maskHistory` is cleared (it is replaced in `initializeCanvases`, but if the component stays mounted with a different route, the hook may not re-run; confirm unmount/remount or explicit clear when leaving Inpaint).

### 3. InternalNode — **175 MB (7× ~25 MB)**

- **What:** InternalNode is often from React Fiber or libraries that wrap DOM (e.g. Framer Motion,某些 DnD/tree libs). The 25 MB chunks suggest these nodes are in a retainer path to large buffers (e.g. canvas or image in the same tree).
- **Code:** No direct `InternalNode` or `react-dnd` usage found. `OptionPicker` uses `useDropdownPosition` only. Likely React-internal or a transitive dependency.
- **Recommendation:** Inspect whether Inpaint/CanvasArea stays mounted when not visible (e.g. conditional render vs. unmount). Unmounting when leaving the view would drop React tree and any retained buffers. If a library holds refs to DOM that retain canvas/image, consider removing or replacing it.

### 4. SVGPathElement, SVGSVGElement, SVGAnimatedLength, Text — **100–150 MB each**

- **What:** SVG and text DOM nodes in the retainer paths to the same ~25 MB buffers. These are likely parents/siblings of the `<img>` or `<canvas>` in `CanvasArea` (e.g. SVG icons, OptionPicker, or overlays).
- **Code:** `client/src/components/InpaintCanvas/components/CanvasArea.tsx`:
  - Crop/selection outline divs: `outline outline-red-500` (line 354), `outline-dotted outline-green-500` (line 341).
  - `<img … Image to inpaint>` (lines 304–317) and mask/overlay `<canvas>` (lines 320+).
- **Recommendation:** The divs themselves do not allocate buffers; the retainer path goes through the DOM tree. Ensure the `<img>` and canvases are released when the view or workspace changes (e.g. `img.src = ''` or unmount). The SVG nodes are likely from shared icons; reducing retained references to large images/canvases in the same tree will help.

### 5. `<img src="…/full.png" …>` and buttons/divs (25 MB each)

- **What:** The workspace `full.png` image and various buttons/divs appear as retainers of 25 MB `JSArrayBufferData`. The decoded image buffer for a large full-res image is expected; the buttons/divs are in the same retainer path (e.g. same React subtree).
- **Code:** `CanvasArea.tsx` (lines 304–317):  
  `mainImageSrc` / `resolvedInputImage` or `resolvedCurrentImage` → `resolveImageSrc(…, "full")` → `…/full.png`.
- **Recommendation:** When switching workspaces or closing the Inpaint tab, unmount the img or set `src` to a placeholder so the decoded buffer can be collected. Avoid holding many workspace images in memory at once (e.g. prefetch/cache limits).

### 6. (Traced handles) — **525 MB (21× ~25 MB)**

- **What:** V8/Chromium internal handles. Not directly actionable in app code; reducing other retainers (Performance API, maskHistory, long-lived DOM/canvas refs) should reduce what gets traced.

---

## Buffer-like nodes by self_size

The largest `system / JSArrayBufferData` nodes have self_size 56.25 MB and 25 MB (many). These align with:

- **56 MB:** ~3750×3750×4 or similar (e.g. full-res canvas or composite).
- **25 MB:** ~2500×2500×4 (e.g. mask canvas, scaled image, or workspace image).

---

## How to re-run the analysis

```bash
node --max-old-space-size=4096 scripts/analyze_heapsnapshot_arraybuffer.js heapsnapshots/Heap-20260124T173433.heapsnapshot
```

The script also lists top buffer/typedarray/image-like nodes by self_size.
