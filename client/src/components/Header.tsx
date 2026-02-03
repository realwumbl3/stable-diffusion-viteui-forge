import WorkspaceTabs from './WorkspaceTabs'
import { cn } from '../lib/utils'
import { Lock, Unlock } from 'lucide-react'
import OptionPicker from './OptionPicker'
import NumberSelector from './NumberSelector'
import { useWorkspaceContext, useWorkspaceState } from '../contexts/WorkspaceContext'
import api from '../Api'
import { useCallback } from 'react'
import { ModuleInfo } from '../Api'

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
    modules,
    samplers,
  } = useWorkspaceContext()

  const { workspaceState, updateWorkspaceState } = useWorkspaceState(currentWorkspace)
  const { generation, ui } = workspaceState
  const { selectedModel, selectedVAE, selectedSampler, cfgScale, clipSkip } = generation
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

  const handleVAEChange = useCallback(async (vae: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedVAE: vae }
    }))
    try {
      const modules = vae === "Automatic" ? [] : [vae];
      await api.setModules(modules)
    } catch (error) {
      console.error("Error setting VAE:", error)
    }
  }, [updateWorkspaceState])

  const setSelectedSampler = useCallback((sampler: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedSampler: sampler }
    }))
  }, [updateWorkspaceState])

  const setClipSkip = useCallback((skip: number) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, clipSkip: skip }
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
          options={[
            { value: "Automatic", label: "Automatic" },
            ...modules.map((module: ModuleInfo) => ({
              value: module.model_name,
              label: module.model_name.split(".safetensors")[0] || module.model_name
            }))
          ]}
          value={selectedVAE || "Automatic"}
          onChange={handleVAEChange}
          title="VAE"
        />
        <NumberSelector
          value={clipSkip}
          onChange={setClipSkip}
          min={1}
          max={12}
          step={1}
          label="Clip Skip"
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

