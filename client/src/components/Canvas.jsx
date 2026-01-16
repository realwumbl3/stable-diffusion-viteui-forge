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
import PromptFooter from './PromptFooter.jsx'

const Canvas = ({
  currentImage,
  livePreview,
  loading,
  progress,
  generationWidth,
  generationHeight,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt
}) => {
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(true)
  const [footerCollapsed, setFooterCollapsed] = useState(false)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const getDisplayDimensions = () => {
    if (!imageRef.current) {
      return { width: 1, height: 1 }
    }

    if (livePreview && generationWidth && generationHeight) {
      return { width: generationWidth, height: generationHeight }
    }

    return {
      width: imageRef.current.naturalWidth || 1,
      height: imageRef.current.naturalHeight || 1
    }
  }

  const calculateFitToScreenScale = () => {
    if (!canvasRef.current || !imageRef.current) return 1

    const container = canvasRef.current.getBoundingClientRect()
    const { width: imageWidth, height: imageHeight } = getDisplayDimensions()

    // Get available space (accounting for padding)
    const availableWidth = container.width - 32 // 32px padding on each side
    const availableHeight = container.height - 32 // 32px padding on each side

    // Calculate scale to fit the longest side
    const scaleX = availableWidth / imageWidth
    const scaleY = availableHeight / imageHeight
    const scale = Math.min(scaleX, scaleY)

    return scale
  }

  // Auto-fit to screen when image changes
  useEffect(() => {
    if ((currentImage || livePreview) && fitToScreen) {
      // Small delay to ensure image is loaded
      const timer = setTimeout(() => {
        const scale = calculateFitToScreenScale()
        setZoom(scale)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentImage, livePreview, generationWidth, generationHeight, fitToScreen])

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
    const scale = calculateFitToScreenScale()
    setZoom(scale)
    setFitToScreen(true)
  }

  return (
    <main className="studio-canvas relative flex flex-col">
      {/* Canvas Controls */}
      {currentImage && (
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
      )}

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full flex items-center justify-center p-8 overflow-hidden"
        >
          {/* Loading State - Show when generating and no image yet */}
          {loading && !currentImage ? (
            <div className="text-center">
              <div className="w-24 h-24 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              {progress ? (
                <>
                  <p className="text-studio-text text-lg mb-4">
                    {progress.textinfo || 'Generating image...'}
                  </p>
                  <div className="w-64 h-3 bg-studio-bg/30 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-studio-accent transition-all duration-300 ease-out"
                      style={{ width: `${progress.progress * 100}%` }}
                    />
                  </div>
                  <p className="text-studio-textSecondary text-sm">
                    {Math.round(progress.progress * 100)}%
                    {progress.total_batches > 1 && ` • Batch ${progress.current_batch}/${progress.total_batches}`}
                    {progress.eta && ` • ETA: ${Math.round(progress.eta)}s`}
                  </p>
                </>
              ) : (
                <p className="text-studio-textSecondary text-lg">Starting generation...</p>
              )}
            </div>
          ) : currentImage ? (
            /* Image Display */
            <div
              className="relative"
              style={{
                transform: `scale(${zoom})`,
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
                key={livePreview ? 'live-preview' : 'current-image'}
                ref={imageRef}
                src={livePreview || currentImage}
                alt="Generated"
                className="max-w-none shadow-studio-lg rounded-lg"
                style={
                  livePreview && generationWidth && generationHeight
                    ? { width: `${generationWidth}px`, height: `${generationHeight}px` }
                    : undefined
                }
                draggable={false}
              />

              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {progress ? (
                      <>
                        <div className="w-8 h-8 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-studio-text text-sm mb-2">
                          {progress.textinfo || 'Generating...'}
                        </p>
                        <div className="w-32 h-2 bg-studio-bg/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-studio-accent transition-all duration-300 ease-out"
                            style={{ width: `${progress.progress * 100}%` }}
                          />
                        </div>
                        <p className="text-studio-textSecondary text-xs mt-1">
                          {Math.round(progress.progress * 100)}%
                          {progress.total_batches > 1 && ` • ${progress.current_batch}/${progress.total_batches}`}
                          {progress.eta && ` • ETA: ${Math.round(progress.eta)}s`}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-studio-text text-sm">Regenerating...</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center text-studio-text-muted">
              <div className="w-24 h-24 border-2 border-dashed border-studio-border rounded-lg flex items-center justify-center mb-4 mx-auto">
                <div className="w-8 h-8 border-2 border-studio-text-muted border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready to Create</h3>
              <p className="text-sm">Set your parameters and generate your first image</p>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Footer */}
      <PromptFooter
        prompt={prompt}
        setPrompt={setPrompt}
        negativePrompt={negativePrompt}
        setNegativePrompt={setNegativePrompt}
        collapsed={footerCollapsed}
        onToggle={() => setFooterCollapsed(!footerCollapsed)}
      />

      {/* Status Bar */}
      <div className="studio-toolbar justify-between text-xs text-studio-textSecondary">
        <div className="flex items-center gap-4">
          <span>Canvas</span>
          {currentImage && (
            <>
              <span>•</span>
              <span>{zoom !== 1 ? `${Math.round(zoom * 100)}%` : 'Fit to screen'}</span>
            </>
          )}
          {progress && loading && (
            <>
              <span>•</span>
              <span>Step {progress.sampling_step || 0}/{progress.sampling_steps || 0}</span>
              {progress.total_batches > 1 && (
                <>
                  <span>•</span>
                  <span>Batch {progress.current_batch}/{progress.total_batches}</span>
                </>
              )}
              <span>•</span>
              <span>{Math.round(progress.progress * 100)}%</span>
              {progress.eta && (
                <>
                  <span>•</span>
                  <span>ETA: {Math.round(progress.eta)}s</span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>Stable Diffusion WebUI</span>
          {progress && loading && (
            <span className="text-studio-accent">
              {progress.textinfo}
            </span>
          )}
        </div>
      </div>
    </main>
  )
}

export default Canvas