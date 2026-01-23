// VITE UI

// useWorkspaceTabs hook return type
export interface UseWorkspaceTabsReturn {
  openWorkspaces: string[]
  currentWorkspace: string | null
  openWorkspace: (workspaceName: string) => void
  closeWorkspace: (workspaceName: string) => void
  switchWorkspace: (workspaceName: string) => void
  closeAllWorkspaces: () => void
}
