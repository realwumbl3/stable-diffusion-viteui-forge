import { useState } from 'react'
import { X, Loader2, Maximize2 } from 'lucide-react'
import { cn } from '../lib/utils'

const UpscaleDialog = ({
  isOpen,
  onClose,
  onUpscale,
  sourceImage,
  selectedUpscaler,
  availableUpscalers,
  loading = false,
  error = null
}) => {
  const [currentUpscaler, setCurrentUpscaler] = useState(selectedUpscaler)

  if (!isOpen || !sourceImage) return null

  const scaleFactors = [1.5, 2, 3, 4]

  const handleUpscale = (scaleFactor) => {
    onUpscale(currentUpscaler, scaleFactor)
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Source Image Preview */}
          <div className="flex justify-center">
            <img
              src={sourceImage.image}
              alt="Source"
              className="max-w-full max-h-32 object-contain rounded border border-studio-border"
            />
          </div>

          {/* Upscaler Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-studio-text">
              Upscaler
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableUpscalers.length > 0 ? (
                availableUpscalers.map((upscaler) => (
                  <label key={upscaler.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upscaler"
                      value={upscaler.name}
                      checked={currentUpscaler === upscaler.name}
                      onChange={(e) => setCurrentUpscaler(e.target.value)}
                      className="text-studio-accent focus:ring-studio-accent"
                      disabled={loading}
                    />
                    <span className="text-sm text-studio-textSecondary">
                      {upscaler.name}
                      {upscaler.scale && upscaler.scale !== 1 && (
                        <span className="text-studio-textMuted ml-1">
                          ({upscaler.scale}x)
                        </span>
                      )}
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-studio-textSecondary">
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
              {scaleFactors.map((factor) => (
                <button
                  key={factor}
                  onClick={() => handleUpscale(factor)}
                  disabled={loading}
                  className={cn(
                    "px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border",
                    loading
                      ? "bg-studio-surface border-studio-border text-studio-textMuted cursor-not-allowed"
                      : "bg-studio-surface border-studio-border text-studio-text hover:bg-studio-panelHover hover:border-studio-accent"
                  )}
                >
                  {factor}x
                </button>
              ))}
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