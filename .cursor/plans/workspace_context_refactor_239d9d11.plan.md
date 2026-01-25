---
name: workspace_context_refactor
overview: Introduce a workspace-level context/provider to reduce prop drilling and rerenders in client state, focused on workspace tabs and view state.
todos:
  - id: workspace-context
    content: Create WorkspaceContext + provider and move tab state.
    status: pending
  - id: fix-tabs-bug
    content: Fix stale closure in closeWorkspace.
    status: pending
  - id: wire-consumers
    content: Update Header/WorkspaceTabs/WorkspaceBrowser consumers.
    status: pending
  - id: viewstate-context
    content: Add ViewStateContext and update Header/Sidebar.
    status: pending
  - id: memo-boundaries
    content: Add memoization to reduce rerenders.
    status: pending
  - id: validate-ui
    content: Verify workspace and sidebar behaviors.
    status: pending
isProject: false
---

# Workspace-level State Refactor

## Goals

- Reduce prop drilling from `App.tsx` to header/sidebar/workspace components.
- Isolate workspace tab state and view state behind providers to reduce rerenders.
- Fix the stale closure bug in `useWorkspaceTabs.ts` while refactoring.

## Phase 1: WorkspaceContext (primary)

- Create a `WorkspaceContext` provider to own `openWorkspaces`, `currentWorkspace`, and workspace browser open state (plus actions).
- Move localStorage synchronization into the provider and expose memoized selectors/actions for consumers.
- Fix `closeWorkspace` to use the latest `openWorkspaces` state instead of a stale closure.

Key files:

- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/contexts/WorkspaceContext.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/contexts/WorkspaceContext.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/hooks/useWorkspaceTabs.ts](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/hooks/useWorkspaceTabs.ts)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/App.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/App.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Header.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Header.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/WorkspaceTabs.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/WorkspaceTabs.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/WorkspaceBrowser.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/WorkspaceBrowser.tsx)

## Phase 2: ViewStateContext (secondary)

- Introduce a lightweight `ViewStateContext` to own `sidebarCollapsed`, `pageLocked`, and `upscaleDialog` state.
- Reduce props passed into `Header` and `Sidebar` by consuming context directly.
- Ensure state updates are memoized and avoid re-rendering unrelated trees.

Key files:

- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/contexts/ViewStateContext.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/contexts/ViewStateContext.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Sidebar.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Sidebar.tsx)
- [C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Header.tsx](C:/Users/wumbl/Documents/DEV/viteui/stable-diffusion-viteui-forge/client/src/components/Header.tsx)

## Phase 3: Rerender hygiene

- Add `React.memo`/`useMemo` boundaries around header/sidebar subcomponents that read only small slices of context.
- Ensure context values are stable (memoize state/actions separately to avoid broad rerenders).

## Validation

- Verify workspace switching, closing, and creation behavior.
- Confirm no regressions in sidebar state and workspace browser modal.
- Use React DevTools profiler to confirm reduced rerenders in `Header`, `WorkspaceTabs`, and `Sidebar`.

## Optional follow-up

- Evaluate a separate `TimelineContext` later if `timeline` updates still cause unnecessary rerenders in `Sidebar`.