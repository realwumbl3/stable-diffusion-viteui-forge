---
name: ""
overview: ""
todos: []
isProject: false
---

# Workspace Context Refactor

## Goals

- Make every workspace provider return a fully isolated workspace state bundle.
- Ensure each workspace has its own generation params, UI state, canvas state, and history.
- Render a `Workspace.tsx` component per open workspace.
- Move all non-header UI from `App.tsx` into `Workspace.tsx`.
- Memoize the last two active workspaces to avoid rerender on switch.

## Phase 0: State inventory (read-only)

Identify where each of these live today and whether they are global or implicit:

- Workspace identity + tab data (`openWorkspaces`, `currentWorkspace`, labels).
- Generation params: model, sampler, CFG, steps, seed, size, batch size/count.
- Mode and inpaint state: mode, masks, inpaint options, strength, brush settings.
- UI state: prompt text, negative prompt, timeline view state, selected tool, panels.
- Canvas state: current canvas, history/undo, staging layers, viewport/zoom.

Key files to scan:

- `client/src/App.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/components/InpaintCanvas/components/InpaintCanvas.tsx`
- `client/src/components/InpaintCanvas/components/CanvasArea.tsx`
- `client/src/types/components.ts`

## Phase 1: WorkspaceProvider with full workspace bundles

Create a single `WorkspaceProvider` that stores a map of workspace IDs to:

- `generation`: model/sampler/CFG/steps/seed/size/batch params.
- `mode`: txt2img/img2img/inpaint + inpaint state.
- `ui`: prompt text, timeline, panel toggles, editor selections.
- `canvas`: canvas instance state + history + viewport + layers.

Provider responsibilities:

- Provide selectors + actions to mutate a single workspace by ID.
- Persist workspace state as needed (localStorage or session cache).
- Keep actions stable with `useCallback` and memoize the context value.
- Ensure closing a workspace cleans its state and cached render.

## Phase 2: New `Workspace.tsx` renderer

Add `client/src/components/Workspace.tsx` that renders the main UI body:

- Sidebars, prompt editor, canvas/editor panels, timeline.
- All state for these subtrees should come from the workspace context.
- `App.tsx` keeps only header and top-level layout shell.

Migration approach:

- Extract the non-header portion of `App.tsx` into `Workspace.tsx`.
- Replace direct state props with context selectors.
- Keep existing component APIs where possible to minimize churn.

## Phase 3: Memoized workspace switching (last two)

Implement a `WorkspaceCache` inside `App.tsx` that:

- Tracks `activeWorkspaceId` and `recentWorkspaceIds` (max 2).
- Renders two `Workspace` instances (active + previous) and hides the inactive.
- Preserves component state by not unmounting cached workspaces.

Notes:

- Use `React.memo` for `Workspace` to avoid prop churn.
- Keep cache eviction deterministic (LRU of last two switches).
- Ensure workspace close removes its cached renderer.

## Phase 4: Wiring + cleanup

- Update `WorkspaceTabs`, `WorkspaceBrowser`, and header actions to use provider.
- Remove redundant state in `App.tsx` and eliminate prop drilling.
- Confirm per-workspace state isolation (switching does not leak prompts/models).

## Validation

- Switch between two workspaces rapidly; no rerender-induced flicker.
- Confirm canvas history and prompt text are isolated per workspace.
- Closing a workspace removes its cached instance and state cleanly.