import { useState, useRef, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Grid3X3,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const Canvas = ({ currentImage, loading }) => {
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(true)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5))
    setFitToScreen(false)
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1))
    setFitToScreen(false)
  }

  const handleResetZoom = () => {
    setZoom(1)
    setFitToScreen(true)
  }

  const handleFitToScreen = () => {
    setFitToScreen(true)
    setZoom(1)
  }

  // Loading skeleton
  if (loading && !currentImage) {
    return (
      <main className="studio-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-studio-textSecondary">Generating image...</p>
        </div>
      </main>
    )
  }

  // Empty state
  if (!currentImage) {
    return (
      <main className="studio-canvas flex items-center justify-center">
        <div className="text-center text-studio-text-muted">
          <div className="w-24 h-24 border-2 border-dashed border-studio-border rounded-lg flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-2 border-studio-text-muted border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-lg font-medium mb-2">Ready to Create</h3>
          <p className="text-sm">Set your parameters and generate your first image</p>
        </div>
      </main>
    )
  }

  return (
    <main className="studio-canvas relative">
      {/* Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="studio-panel p-2">
          <div className="flex gap-1">
            <button
              onClick={handleZoomOut}
              className="studio-btn-ghost p-2"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              className="studio-btn-ghost px-3 py-2 text-xs font-mono min-w-[60px]"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="studio-btn-ghost p-2"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-6 bg-studio-border mx-1" />
            <button
              onClick={handleFitToScreen}
              className={cn(
                "studio-btn-ghost p-2",
                fitToScreen && "text-studio-accent"
              )}
              title="Fit to Screen"
            >
              <Maximize size={16} />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "studio-btn-ghost p-2",
                showGrid && "text-studio-accent"
              )}
              title="Toggle Grid"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="w-full h-full flex items-center justify-center p-8 overflow-hidden"
      >
        <div
          className="relative"
          style={{
            transform: fitToScreen ? 'scale(1)' : `scale(${zoom})`,
            transformOrigin: 'center',
            transition: fitToScreen ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {/* Grid Overlay */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, var(--studio-border) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--studio-border) 1px, transparent 1px)
                `,
                backgroundSize: '32px 32px'
              }}
            />
          )}

          {/* Main Image */}
          <img
            ref={imageRef}
            src={currentImage}
            alt="Generated"
            className="max-w-none shadow-studio-lg rounded-lg"
            style={{
              maxWidth: fitToScreen ? '100%' : 'none',
              maxHeight: fitToScreen ? '100%' : 'none'
            }}
            draggable={false}
          />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-studio-text text-sm">Regenerating...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 studio-toolbar justify-between text-xs text-studio-textSecondary">
        <div className="flex items-center gap-4">
          <span>Canvas</span>
          {currentImage && (
            <>
              <span>•</span>
              <span>{zoom !== 1 ? `${Math.round(zoom * 100)}%` : 'Fit to screen'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>Stable Diffusion WebUI</span>
        </div>
      </div>
    </main>
  )
}

export default Canvas