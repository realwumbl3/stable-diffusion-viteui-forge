import {
  Settings,
  Save,
  Download,
  Zap,
  Image as ImageIcon,
  Type,
  SkipForward,
  Square,
  RotateCw,
  Edit,
  Lock,
  Unlock
} from 'lucide-react'
import NumberSelector from './NumberSelector.jsx'
import OptionPicker from './OptionPicker.jsx'
import { cn } from '../lib/utils'
import WorkspacePicker from './WorkspacePicker.jsx'
import ResolutionIndicator from './ResolutionIndicator.jsx'

const Header = ({
  loading,
  progress,
  onGenerate,
  canGenerate,
  onSkip,
  onRestart,
  onInterrupt,
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  onCreateWorkspace,
  onOpenWorkspace,
  pageLocked,
  onToggleLock,
  // New parameters for header controls
  steps,
  setSteps,
  count,
  setCount,
  selectedSampler,
  setSelectedSampler,
  cfgScale,
  setCfgScale,
  models,
  selectedModel,
  onModelChange,
  samplers,
  // Resolution parameters
  width,
  setWidth,
  height,
  setHeight,
  inputImage
}) => {
  return (
    <header className="studio-toolbar border-b-studio-border">
      {/* Left Section - Workspace */}
      <div className="flex items-center gap-3">
        <WorkspacePicker
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onWorkspaceChange={onWorkspaceChange}
          onCreateWorkspace={onCreateWorkspace}
          onOpenWorkspace={onOpenWorkspace}
        />
      </div>

      {/* Center Section - Main Actions */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2">
          {/* Skip and Interrupt buttons moved to right section */}
        </div>
      </div>

      {/* Right Section - Model Controls and File Operations */}
      <div className="flex items-center gap-3">
        {/* Resolution Indicator */}
        <ResolutionIndicator
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
          inputImage={inputImage}
        />

        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className={cn(
            "studio-btn-primary flex flex-col items-center gap-1 px-4 py-2 relative",
            (!canGenerate || loading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading && progress ? (
            <>
              <div className="flex flex-col items-center gap-1">
                <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{Math.round(progress.progress * 100)}%</span>
                {progress.total_batches > 1 && (
                  <span className="text-xs text-studio-textSecondary">
                    (Batch {progress.current_batch}/{progress.total_batches})
                  </span>
                )}
              </div>
              {/* Progress bar overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-studio-bg/20 rounded-b-md overflow-hidden">
                <div
                  className="h-full bg-studio-accent transition-all duration-300 ease-out"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
            </>
          ) : loading ? (
            <>
              <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Generating...</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              Generate
            </>
          )}
        </button>

        {/* Skip and Interrupt buttons - only show when generating */}
        {loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
              title="Skip current generation"
            >
              <SkipForward size={16} />
              Skip
            </button>
            <button
              onClick={onRestart}
              className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
              title="Restart generation after interrupting current work"
            >
              <RotateCw size={16} />
              Restart
            </button>
            <button
              onClick={onInterrupt}
              className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
              title="Interrupt all generations"
            >
              <Square size={16} />
              End
            </button>
          </div>
        )}

        {/* Steps and Count controls */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <NumberSelector
              value={steps}
              onChange={setSteps}
              min={1}
              max={100}
              step={1}
            />
            <label className="text-xs text-studio-textSecondary font-medium">Steps</label>
          </div>

          <div className="flex flex-col items-center gap-1">
            <NumberSelector
              value={count}
              onChange={setCount}
              min={1}
              max={50}
              step={1}
            />
            <label className="text-xs text-studio-textSecondary font-medium">Count</label>
          </div>

          {/* Model and Sampler Controls */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-studio-border">
            {/* Model and Sampler Stack */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-end gap-2">
                <OptionPicker
                  options={models.map((model) => ({
                    value: model.title,
                    label: model.model_name
                  }))}
                  value={selectedModel}
                  onChange={onModelChange}
                  title="Model"
                />
              </div>

              <div className="flex justify-end gap-2">
                <OptionPicker
                  options={samplers.map((sampler) => ({
                    value: sampler.name,
                    label: sampler.name
                  }))}
                  value={selectedSampler}
                  onChange={setSelectedSampler}
                  title="Sampler"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NumberSelector
                value={cfgScale}
                onChange={setCfgScale}
                min={1}
                max={33}
                step={1}
              />
              <label className="text-xs text-studio-textSecondary font-medium">CFG</label>
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-studio-border mx-2" />

        {/* <button className="studio-btn-ghost p-2" title="Save Project (Ctrl+S)">
          <Save size={18} />
        </button> */}
        {/* <button className="studio-btn-ghost p-2" title="Export (Ctrl+Shift+S)">
          <Download size={18} />
        </button> */}
        <button
          onClick={onToggleLock}
          className={cn(
            "studio-btn-ghost p-2",
            pageLocked && "text-studio-accent"
          )}
          title={pageLocked ? "Unlock page (prevents accidental navigation)" : "Lock page (prevents accidental navigation)"}
        >
          {pageLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>
        {/* <button className="studio-btn-ghost p-2" title="Settings">
          <Settings size={18} />
        </button> */}
      </div>
    </header>
  )
}

export default Header