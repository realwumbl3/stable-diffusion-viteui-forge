// VITE UI
import WorkspaceTabs from './WorkspaceTabs'
import type { HeaderProps } from '../types/components'

const Header = ({
  openWorkspaces,
  currentWorkspace,
  onWorkspaceChange,
  onWorkspaceClose,
  onCreateWorkspace,
  onOpenWorkspaceBrowser,
}: HeaderProps) => {
  return (
    <header className="studio-toolbar border-b-studio-border">
      <div className="w-full self-end">
        <WorkspaceTabs
          openWorkspaces={openWorkspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={onWorkspaceChange}
          onWorkspaceClose={onWorkspaceClose}
          onCreateWorkspace={onCreateWorkspace}
          onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
        />
      </div>
    </header>
  )
}

export default Header
