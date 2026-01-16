import { useState } from 'react'
import {
  Brush,
  Eraser,
  PaintBucket,
  RotateCcw,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Square
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const InpaintToolbar = ({
  drawingMode,
  setDrawingMode,
  brushSize,
  setBrushSize,
  brushHardness,
  setBrushHardness,
  zoom = 1,
  showMask,
  setShowMask,
  showBorder,
  setShowBorder,
  inpaintFullRes,
  inpaintFullResPadding,
  setInpaintFullResPadding,
  onUndo,
  onRedo,
  onClear,
  onFill,
  previewSrc,
  previewLabel,
  onTogglePreview,
  canUndo = false,
  canRedo = false
}) => {
  const tools = [
    {
      id: 'brush',
      icon: Brush,
      label: 'Brush',
      shortcut: 'B'
    },
    {
      id: 'erase',
      icon: Eraser,
      label: 'Eraser',
      shortcut: 'E'
    },
    {
      id: 'fill',
      icon: PaintBucket,
      label: 'Fill',
      shortcut: 'F'
    },
    {
      id: 'clear',
      icon: RotateCcw,
      label: 'Clear All',
      shortcut: 'C'
    }
  ]

  return (
    <div className="studio-panel p-2 w-48">
      <div className="flex flex-col gap-2">
        {/* Drawing Tools */}
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-1 bg-studio-surface rounded-lg p-1 border border-studio-border">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  if (tool.id === 'clear') {
                    onClear()
                  } else if (tool.id === 'fill') {
                    onFill()
                  } else {
                    setDrawingMode(tool.id)
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                  (drawingMode === tool.id)
                    ? "bg-studio-accent text-studio-bg shadow-sm"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <tool.icon size={14} />
                <span className="text-center leading-tight">{tool.label}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-studio-textSecondary text-center">Tools</span>
        </div>

        {/* Mask and Border Visibility Toggles */}
        <div className="flex flex-row gap-1">
          <button
            onClick={() => setShowMask(!showMask)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1",
              showMask
                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
            )}
            title="Toggle Mask Visibility"
          >
            {showMask ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="text-center leading-tight">Mask</span>
          </button>

          <button
            onClick={() => setShowBorder(!showBorder)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1",
              showBorder
                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
            )}
            title="Toggle Border Visualization"
          >
            <Square size={14} />
            <span className="text-center leading-tight">Border</span>
          </button>
        </div>

        {/* Padding Control */}
        {inpaintFullRes && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center gap-1 cursor-pointer"
                onWheel={(e) => {
                  e.preventDefault()
                  if (e.deltaY > 0) {
                    setInpaintFullResPadding(Math.max(0, inpaintFullResPadding - 64))
                  } else {
                    setInpaintFullResPadding(Math.min(1024, inpaintFullResPadding + 64))
                  }
                }}
                title="Scroll to adjust padding (64px increments)"
              >
                <button
                  onClick={() => setInpaintFullResPadding(Math.max(0, inpaintFullResPadding - 8))}
                  className="studio-btn-ghost p-1"
                  title="Decrease Padding"
                >
                  <Minus size={12} />
                </button>
                <div className="flex items-center px-2 py-1 bg-studio-surface rounded border border-studio-border min-w-[45px] justify-center">
                  <span className="text-xs font-medium text-studio-text">{inpaintFullResPadding}</span>
                </div>
                <button
                  onClick={() => setInpaintFullResPadding(Math.min(1024, inpaintFullResPadding + 8))}
                  className="studio-btn-ghost p-1"
                  title="Increase Padding"
                >
                  <Plus size={12} />
                </button>
              </div>
              <span className="text-xs text-studio-textSecondary text-center">Padding</span>
            </div>
          </div>
        )}

        {/* Undo/Redo (Optional) */}
        {(canUndo || canRedo) && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                  "flex-1 studio-btn-ghost p-1 flex flex-col items-center gap-1",
                  !canUndo && "opacity-50 cursor-not-allowed"
                )}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={12} />
                <span className="text-xs">Undo</span>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={cn(
                  "flex-1 studio-btn-ghost p-1 flex flex-col items-center gap-1",
                  !canRedo && "opacity-50 cursor-not-allowed"
                )}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={12} />
                <span className="text-xs">Redo</span>
              </button>
            </div>
          </div>
        )}

        {/* Result/Mask Preview Toggle */}
        {previewSrc && (
          <div className="flex flex-col gap-1">
            <button
              onClick={onTogglePreview}
              className="flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
              title="Toggle result and mask editor"
            >
              <div className="w-40 bg-studio-surface rounded border border-studio-border overflow-hidden">
                <img
                  src={previewSrc}
                  alt={previewLabel || 'Preview'}
                  className="w-full h-auto object-contain"
                />
              </div>
              <span className="text-center leading-tight">{previewLabel}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InpaintToolbar