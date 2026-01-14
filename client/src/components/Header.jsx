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
  Layers
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const Header = ({ loading, onGenerate, canGenerate, activeTool, onToolChange }) => {
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
          <button
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            className={cn(
              "studio-btn-primary flex items-center gap-2 px-6 py-2",
              (!canGenerate || loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
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