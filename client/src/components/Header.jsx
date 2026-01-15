import {
  Play,
  Pause,
  Settings,
  Save,
  FolderOpen,
  Download,
  Upload,
  Zap,
  Wand2,
  Image as ImageIcon,
  Palette,
  Layers,
  Type,
  SkipForward,
  Square
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const Header = ({ loading, progress, onGenerate, canGenerate, activeTool, onToolChange, generationMode, setGenerationMode, onSkip, onInterrupt }) => {
  const tools = [
    { id: 'generate', icon: Wand2, label: 'Generate', shortcut: 'Ctrl+G' },
    { id: 'edit', icon: Palette, label: 'Edit', shortcut: 'Ctrl+E' },
    { id: 'layers', icon: Layers, label: 'Layers', shortcut: 'Ctrl+L' },
    { id: 'image', icon: ImageIcon, label: 'Import', shortcut: 'Ctrl+I' },
  ]

  return (
    <header className="studio-toolbar border-b-studio-border">
      {/* Left Section - Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "studio-btn-ghost p-2 rounded-md transition-all duration-200",
              activeTool === tool.id && "bg-studio-accent/20 text-studio-accent border-studio-accent/30"
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <tool.icon size={18} />
          </button>
        ))}
      </div>

      {/* Center Section - Main Actions */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2">
          {/* Generation Mode Buttons */}
          <div className="flex items-center bg-studio-surface rounded-lg p-1 border border-studio-border">
            <button
              onClick={() => setGenerationMode('txt2img')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                generationMode === 'txt2img'
                  ? "bg-studio-accent text-studio-bg shadow-sm"
                  : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
              )}
              title="Text to Image (Alt+T)"
            >
              <Type size={16} />
              <span className="hidden sm:inline">Text</span>
            </button>
            <button
              onClick={() => setGenerationMode('img2img')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                generationMode === 'img2img'
                  ? "bg-studio-accent text-studio-bg shadow-sm"
                  : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
              )}
              title="Image to Image (Alt+I)"
            >
              <ImageIcon size={16} />
              <span className="hidden sm:inline">Image</span>
            </button>
          </div>

          {/* Skip and Interrupt buttons - only show when generating */}
          {loading && (
            <div className="flex items-center gap-2">
              <button
                onClick={onSkip}
                className="studio-btn-secondary flex items-center gap-2 px-4 py-2 text-sm hover:bg-studio-accent/20"
                title="Skip current generation"
              >
                <SkipForward size={16} />
                Skip
              </button>
              <button
                onClick={onInterrupt}
                className="studio-btn-secondary flex items-center gap-2 px-4 py-2 text-sm hover:bg-studio-accent/20"
                title="Interrupt all generations"
              >
                <Square size={16} />
                End
              </button>
            </div>
          )}

          <button
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            className={cn(
              "studio-btn-primary flex items-center gap-2 px-6 py-2 relative",
              (!canGenerate || loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading && progress ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                  <span>{Math.round(progress.progress * 100)}%</span>
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
                Generating...
              </>
            ) : (
              <>
                <Zap size={16} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Section - File Operations */}
      <div className="flex items-center gap-1">
        <button className="studio-btn-ghost p-2" title="Open Project (Ctrl+O)">
          <FolderOpen size={18} />
        </button>
        <button className="studio-btn-ghost p-2" title="Save Project (Ctrl+S)">
          <Save size={18} />
        </button>
        <button className="studio-btn-ghost p-2" title="Export (Ctrl+Shift+S)">
          <Download size={18} />
        </button>
        <div className="w-px h-6 bg-studio-border mx-2" />
        <button className="studio-btn-ghost p-2" title="Settings">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}

export default Header