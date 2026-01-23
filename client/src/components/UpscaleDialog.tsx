// VITE UI
import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Maximize2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { UpscaleDialogProps } from '../types/components'

const resolveInitialUpscaler = (
  selectedUpscaler: string,
  availableUpscalers: UpscaleDialogProps['availableUpscalers']
) => {
  if (selectedUpscaler) return selectedUpscaler

  if (typeof window !== 'undefined') {
    const savedUpscaler = localStorage.getItem('lastUpscaler')
    if (savedUpscaler && availableUpscalers.find(u => u.name === savedUpscaler)) {
      return savedUpscaler
    }
  }

  return availableUpscalers[0]?.name ?? ''
}

const UpscaleDialog = ({
  isOpen,
  onClose,
  onUpscale,
  sourceImage,
  selectedUpscaler,
  availableUpscalers,
  loading = false,
  error = null
}: UpscaleDialogProps) => {
  const [currentUpscaler, setCurrentUpscaler] = useState<string>(() =>
    resolveInitialUpscaler(selectedUpscaler, availableUpscalers)
  )
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  // Get image dimensions when image loads
  useEffect(() => {
    const img = imgRef.current
    if (img && sourceImage?.image) {
      const handleLoad = (): void => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }

      if (img.complete) {
        handleLoad()
      } else {
        img.addEventListener('load', handleLoad)
        return () => img.removeEventListener('load', handleLoad)
      }
    }
  }, [sourceImage?.image])

  if (!isOpen || !sourceImage) return null

  const scaleFactors = [1.5, 2, 3, 4]

  const handleUpscalerChange = (upscalerName: string): void => {
    setCurrentUpscaler(upscalerName)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastUpscaler', upscalerName)
    }
  }

  const handleUpscale = (scaleFactor: number): void => {
    onUpscale(currentUpscaler, scaleFactor)
  }

  const getScaledDimensions = (scaleFactor: number): { width: number; height: number } | null => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) return null
    return {
      width: Math.round(imageDimensions.width * scaleFactor),
      height: Math.round(imageDimensions.height * scaleFactor)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-lg shadow-studio-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <Maximize2 size={20} className="text-studio-accent" />
            <h2 className="text-lg font-semibold text-studio-text">Upscale Image</h2>
          </div>
          <button
            onClick={onClose}
            className="text-studio-textSecondary hover:text-studio-text p-1 rounded transition-colors"
            disabled={loading}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Source Image Preview */}
          <div className="flex justify-center">
            <img
              ref={imgRef}
              src={sourceImage.image}
              crossOrigin="anonymous"
              alt="Source"
              className="max-w-full max-h-32 object-contain rounded border border-studio-border"
            />
          </div>

          {/* Upscaler Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-studio-text">
              Upscaler
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {availableUpscalers.length > 0 ? (
                availableUpscalers.map((upscaler) => (
                  <button
                    key={upscaler.name}
                    onClick={() => handleUpscalerChange(upscaler.name)}
                    disabled={loading}
                    className={cn(
                      "px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 border whitespace-nowrap",
                      currentUpscaler === upscaler.name
                        ? "bg-studio-accent text-white border-studio-accent"
                        : loading
                        ? "bg-studio-surface border-studio-border text-studio-textMuted cursor-not-allowed"
                        : "bg-studio-surface border-studio-border text-studio-text hover:bg-studio-panelHover hover:border-studio-accent"
                    )}
                    type="button"
                  >
                    {upscaler.name}
                    {upscaler.scale && upscaler.scale !== 1 && (
                      <span className="opacity-75 ml-1">
                        ({upscaler.scale}x)
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-sm text-studio-textSecondary py-2">
                  Loading upscalers...
                </div>
              )}
            </div>
          </div>

          {/* Scale Factor Buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-studio-text">
              Scale Factor
            </label>
            <div className="grid grid-cols-2 gap-2">
              {scaleFactors.map((factor) => {
                const scaledDims = getScaledDimensions(factor)
                return (
                  <button
                    key={factor}
                    onClick={() => handleUpscale(factor)}
                    disabled={loading}
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border text-left",
                      loading
                        ? "bg-studio-surface border-studio-border text-studio-textMuted cursor-not-allowed"
                        : "bg-studio-surface border-studio-border text-studio-text hover:bg-studio-panelHover hover:border-studio-accent"
                    )}
                    type="button"
                  >
                    <div className="flex flex-col items-start">
                      <span>{factor}x</span>
                      {scaledDims && (
                        <span className="text-xs text-studio-textSecondary mt-0.5">
                          {scaledDims.width}×{scaledDims.height}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={16} className="animate-spin text-studio-accent" />
              <span className="text-sm text-studio-textSecondary">
                Upscaling image...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpscaleDialog
