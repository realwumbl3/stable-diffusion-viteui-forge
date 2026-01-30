import { useState, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'

const CreateWorkspaceDialog = ({
  isOpen,
  onClose,
  onCreateWorkspace
}: {
  isOpen: boolean
  onClose: () => void
  onCreateWorkspace: (name: string) => void
}) => {
  const [workspaceName, setWorkspaceName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmedName = workspaceName.trim()
    if (trimmedName) {
      onCreateWorkspace(trimmedName)
      setWorkspaceName('')
      onClose()
    }
  }

  const handleCancel = (): void => {
    setWorkspaceName('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-lg shadow-studio-lg w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <Plus size={20} className="text-studio-accent" />
            <h2 className="text-lg font-semibold text-studio-text">Create New Workspace</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-studio-textSecondary hover:text-studio-text p-1 rounded transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-studio-text">
              Workspace Name
            </label>
            <input
              ref={inputRef}
              id="workspace-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter workspace name..."
              className="w-full px-3 py-2 bg-studio-surface border border-studio-border rounded-md text-studio-text placeholder-studio-textSecondary focus:outline-none focus:ring-2 focus:ring-studio-accent focus:border-studio-accent"
              autoComplete="off"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-studio-textSecondary hover:text-studio-text border border-studio-border rounded-md hover:bg-studio-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!workspaceName.trim()}
              className="px-4 py-2 text-sm font-medium bg-studio-accent text-white rounded-md hover:bg-studio-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateWorkspaceDialog
