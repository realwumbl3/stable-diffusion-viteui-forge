import WorkspaceTabs from './WorkspaceTabs'
import { cn } from '../lib/utils'
import { Lock, Unlock } from 'lucide-react'
import OptionPicker from './OptionPicker'
import NumberSelector from './NumberSelector'
import { useWorkspaceContext, useWorkspaceState } from '../contexts/WorkspaceContext'
import api from '../Api'
import { useCallback } from 'react'

const Header = () => {
  const {
    openWorkspaces,
    currentWorkspace,
    openWorkspace,
    closeWorkspace,
    switchWorkspace,
    removeWorkspaceState,
    setWorkspaceBrowserOpen,
    models,
    samplers,
  } = useWorkspaceContext()

  const { workspaceState, updateWorkspaceState } = useWorkspaceState(currentWorkspace)
  const { generation, ui } = workspaceState
  const { selectedModel, selectedSampler, cfgScale } = generation
  const { pageLocked } = ui

  const handleWorkspaceChange = useCallback((workspaceName: string) => {
    if (!workspaceName) return
    if (!openWorkspaces.includes(workspaceName)) {
      openWorkspace(workspaceName)
    } else {
      switchWorkspace(workspaceName)
    }
  }, [openWorkspaces, openWorkspace, switchWorkspace])

  const handleWorkspaceClose = useCallback((workspaceName: string) => {
    closeWorkspace(workspaceName)
    removeWorkspaceState(workspaceName)
  }, [closeWorkspace, removeWorkspaceState])

  const handleCreateWorkspace = useCallback(async (name: string) => {
    try {
      const result = await api.createWorkspace(name)
      if (result?.name) {
        openWorkspace(result.name)
      }
    } catch (error) {
      console.error("Failed to create workspace:", error)
    }
  }, [openWorkspace])

  const handleModelChange = useCallback(async (modelTitle: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedModel: modelTitle }
    }))
    try {
      await api.setModel(modelTitle)
    } catch (error) {
      console.error("Error setting model:", error)
    }
  }, [updateWorkspaceState])

  const setSelectedSampler = useCallback((sampler: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedSampler: sampler }
    }))
  }, [updateWorkspaceState])

  const setCfgScale = useCallback((scale: number) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, cfgScale: scale }
    }))
  }, [updateWorkspaceState])

  const toggleLock = useCallback(() => {
    updateWorkspaceState((prev) => ({
      ...prev,
      ui: { ...prev.ui, pageLocked: !prev.ui.pageLocked }
    }))
  }, [updateWorkspaceState])

  return (
    <header className="studio-toolbar border-b-studio-border h-[38px] flex items-center gap-2">
      <div className="w-full self-end">
        <WorkspaceTabs
          openWorkspaces={openWorkspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={handleWorkspaceChange}
          onWorkspaceClose={handleWorkspaceClose}
          onCreateWorkspace={handleCreateWorkspace}
          onOpenWorkspaceBrowser={() => setWorkspaceBrowserOpen(true)}
        />
      </div>
      <div className="flex flex-row gap-1">
        <OptionPicker
          options={models.map((model) => ({
            value: model.title,
            label: model.model_name
          }))}
          value={selectedModel}
          onChange={handleModelChange}
          title="Model"
        />
        <OptionPicker
          options={samplers.map((sampler) => ({
            value: sampler.name,
            label: sampler.name
          }))}
          value={selectedSampler}
          onChange={setSelectedSampler}
          title="Sampler"
        />
        <NumberSelector
          value={cfgScale}
          onChange={setCfgScale}
          min={1}
          max={33}
          step={1}
          label="CFG"
        />
      </div>
      <button
        onClick={toggleLock}
        className={cn(
          "studio-btn-ghost p-2 rounded-md",
          pageLocked && "text-studio-accent"
        )}
        title={pageLocked ? "Unlock page (prevents accidental navigation)" : "Lock page (prevents accidental navigation)"}
        type="button"
      >
        {pageLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
    </header>
  )
}

export default Header

