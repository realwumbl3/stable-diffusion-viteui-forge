// VITE UI
import WorkspaceTabs from './WorkspaceTabs'
import { cn } from '../lib/utils'
import { Lock, Unlock } from 'lucide-react'
import OptionPicker from './OptionPicker'
import NumberSelector from './NumberSelector'
import type { ModelInfo, SamplerInfo } from '../Api'

interface HeaderProps {
  models: ModelInfo[]
  selectedModel: string
  onModelChange: (model: string) => void
  samplers: SamplerInfo[]
  selectedSampler: string
  setSelectedSampler: (sampler: string) => void
  openWorkspaces: string[]
  currentWorkspace: string | null
  onWorkspaceChange: (workspace: string) => void
  onWorkspaceClose: (workspace: string) => void
  onCreateWorkspace: (name: string) => void
  onOpenWorkspaceBrowser: () => void
  onToggleLock: () => void
  pageLocked: boolean
  cfgScale: number
  setCfgScale: (cfgScale: number) => void
}

const Header = ({
  openWorkspaces,
  currentWorkspace,
  onWorkspaceChange,
  onWorkspaceClose,
  onCreateWorkspace,
  onOpenWorkspaceBrowser,
  onToggleLock,
  pageLocked,
  models,
  selectedModel,
  onModelChange,
  samplers,
  selectedSampler,
  setSelectedSampler,
  cfgScale,
  setCfgScale,
}: HeaderProps) => {
  return (
    <header className="studio-toolbar border-b-studio-border h-[38px]">
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
      <div className="flex flex-row gap-1">
        <OptionPicker
          options={models.map((model) => ({
            value: model.title,
            label: model.model_name
          }))}
          value={selectedModel}
          onChange={onModelChange}
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
        onClick={onToggleLock}
        className={cn(
          "studio-btn-ghost p-2",
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

