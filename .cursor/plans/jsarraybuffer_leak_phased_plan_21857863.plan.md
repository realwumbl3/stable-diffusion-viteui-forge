---
name: jsarraybuffer_leak_phased_plan
overview: "Phase the JSArrayBufferData leak mitigations: immediate releases of obvious retainers, targeted memory caps for inpaint history, and validation with repeatable heap snapshots."
todos:
  - id: baseline-scenario
    content: Define repeatable heap snapshot scenario + measure.
    status: pending
  - id: perf-api-cleanup
    content: Add performance timing cleanup on view change.
    status: pending
  - id: release-img-canvas
    content: Release img/canvas refs when leaving inpaint.
    status: pending
  - id: mask-history-cap
    content: Reduce or downscale mask history + clear on unmount.
    status: pending
  - id: mount-audit
    content: Ensure inpaint unmounts when not visible.
    status: pending
  - id: validate-snapshots
    content: Re-run snapshots and iterate if needed.
    status: pending
isProject: false
---

# JSArrayBufferData Leak Mitigation Plan

## Phase 0: Baseline and guardrails

- Establish a reproducible leak check loop using the existing snapshot script and a standard scenario (open workspace, load large image, use Inpaint, switch workspace, repeat) so we can quantify reductions.
- Identify where workspace/view switches are handled to attach cleanup hooks (likely `App.tsx` and workspace/tab components).

## Phase 1: Release obvious browser-retained buffers

- Add a cleanup call to `performance.clearResourceTimings()` after large image loads and when leaving the Inpaint view to release Performance API retained buffers. Likely in `App.tsx` (workspace/view switch handler) and/or `InpaintCanvas` mount/unmount cleanup.
- Ensure the main image element is released on view/workspace change by unmounting the inpaint view or explicitly clearing `img.src` and image refs in `CanvasArea.tsx`.

## Phase 2: Cap high-magnitude app buffers (mask history)

- Reduce or dynamically scale `maskHistory` capacity for large canvases and clear history on unmount or input image change. Implement in `useDrawing.tsx` using existing `initializeCanvases`/cleanup patterns.
- Optionally store a downscaled history buffer for undo/redo when the mask resolution exceeds a threshold to cut per-entry memory cost.

## Phase 3: Prevent long-lived DOM retention

- Audit whether Inpaint components remain mounted when not visible and switch to conditional unmount if possible (the report indicates React/InternalNode retainers). This likely involves `InpaintCanvas.tsx` and parent routing/tab logic in `App.tsx`.
- Review overlay/selection DOMs in `CanvasArea.tsx` to ensure no long-lived refs or event listeners keep the canvas tree alive after unmount.

## Phase 4: Validate and iterate

- Re-run the heap snapshot analysis after each phase to confirm reductions in retained `JSArrayBufferData` size and counts.
- If buffers persist, trace remaining retainers (e.g., cached images or reused canvases) and add targeted cleanup.

## Key Files to Touch

- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/App.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/App.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/components/CanvasArea.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/components/CanvasArea.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/components/InpaintCanvas.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/components/InpaintCanvas.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/hooks/useDrawing.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/InpaintCanvas/hooks/useDrawing.tsx)

## Risks and Notes

- `performance.clearResourceTimings()` affects Performance API consumers; if any metrics rely on resource timings, coordinate its usage.
- Downscaling history affects undo fidelity; keep this gated by size thresholds and configurable defaults.

## Test Plan

- Run `node --max-old-space-size=4096 scripts/analyze_heapsnapshot_arraybuffer.js heapsnapshots/Heap-20260124T173433.heapsnapshot` before/after each phase with a fresh snapshot.
- Manual usage: open Inpaint, load a large image, draw, undo/redo, switch workspace, repeat; verify retained size decreases.