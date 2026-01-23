// VITE UI
import { useState } from 'react'
import { ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ResolutionPickerProps } from '../types/components'

interface AspectRatio {
  ratio: string
  name: string
  width: number
  height: number
}

const ResolutionPicker = ({
  width,
  setWidth,
  height,
  setHeight,
  collapsed: externalCollapsed,
  onToggleCollapsed,
  className,
  inputImage
}: ResolutionPickerProps) => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1')
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)
  const [lockedAspectRatio, setLockedAspectRatio] = useState<number | null>(null)

  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const handleToggle = onToggleCollapsed || (() => setInternalCollapsed(!internalCollapsed))

  // Common aspect ratios
  const aspectRatios: AspectRatio[] = [
    { ratio: '1:1', name: 'Square', width: 1, height: 1 },
    { ratio: '4:3', name: 'Standard', width: 4, height: 3 },
    { ratio: '3:2', name: 'Classic', width: 3, height: 2 },
    { ratio: '16:9', name: 'Widescreen', width: 16, height: 9 },
    { ratio: '21:9', name: 'Ultrawide', width: 21, height: 9 },
    { ratio: '2:3', name: 'Portrait', width: 2, height: 3 },
    { ratio: '3:4', name: 'Tall Portrait', width: 3, height: 4 },
    { ratio: '9:16', name: 'Mobile', width: 9, height: 16 },
  ]

  // Generate resolutions based on aspect ratio
  const getResolutionsForAspectRatio = (aspectRatio: AspectRatio): Array<{ w: number; h: number }> => {
    const { width: wRatio, height: hRatio } = aspectRatio
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const divisor = gcd(wRatio, hRatio)
    const normalizedWidth = wRatio / divisor
    const normalizedHeight = hRatio / divisor

    const resolutions: Array<{ w: number; h: number }> = []
    const baseSizes = [512, 768, 1024, 1280, 1536, 1792, 2048, 2304, 2560, 2816, 3072, 3328, 3584, 3840, 4096]

    baseSizes.forEach(base => {
      // For landscape ratios (width > height), use base for width
      // For portrait ratios (height > width), use base for height
      let w: number, h: number
      if (normalizedWidth >= normalizedHeight) {
        w = base
        h = Math.round((base * normalizedHeight) / normalizedWidth)
        // Ensure height is divisible by 64 (common SD requirement)
        h = Math.round(h / 64) * 64
        if (h < 64) h = 64
      } else {
        h = base
        w = Math.round((base * normalizedWidth) / normalizedHeight)
        // Ensure width is divisible by 64
        w = Math.round(w / 64) * 64
        if (w < 64) w = 64
      }

      // Only add if not duplicate
      const exists = resolutions.some(r => r.w === w && r.h === h)
      if (!exists) {
        resolutions.push({ w, h })
      }
    })

    return resolutions.slice(0, 6) // Limit to 6 resolutions
  }

  const currentAspectRatio = aspectRatios.find(ar => ar.ratio === selectedAspectRatio)
  const availableResolutions = currentAspectRatio ? getResolutionsForAspectRatio(currentAspectRatio) : []

  // Function to match source image resolution
  const matchSourceResolution = (): void => {
    if (!inputImage) return

    const img = new Image()
    img.onload = () => {
      // Ensure dimensions are divisible by 64 (common SD requirement)
      const sourceWidth = Math.round(img.width / 64) * 64
      const sourceHeight = Math.round(img.height / 64) * 64

      setWidth(sourceWidth)
      setHeight(sourceHeight)
    }
    img.src = inputImage
  }

  // Handle aspect ratio lock toggle
  const handleAspectRatioLockToggle = (): void => {
    if (!aspectRatioLocked) {
      // When enabling lock, store the current aspect ratio
      setLockedAspectRatio(width / height)
    } else {
      // When disabling lock, clear the stored aspect ratio
      setLockedAspectRatio(null)
    }
    setAspectRatioLocked(!aspectRatioLocked)
  }

  // Handle width change with aspect ratio locking
  const handleWidthChange = (newWidth: string | number): void => {
    const parsedWidth = typeof newWidth === 'string' ? parseInt(newWidth) : newWidth
    if (aspectRatioLocked && parsedWidth > 0 && lockedAspectRatio) {
      // Calculate height maintaining locked aspect ratio
      const newHeight = Math.round(parsedWidth / lockedAspectRatio)
      // Ensure height is divisible by 64
      const adjustedHeight = Math.round(newHeight / 64) * 64
      if (adjustedHeight >= 64) {
        setHeight(adjustedHeight)
      }
    }
    setWidth(parsedWidth)
  }

  // Handle height change with aspect ratio locking
  const handleHeightChange = (newHeight: string | number): void => {
    const parsedHeight = typeof newHeight === 'string' ? parseInt(newHeight) : newHeight
    if (aspectRatioLocked && parsedHeight > 0 && lockedAspectRatio) {
      // Calculate width maintaining locked aspect ratio
      const newWidth = Math.round(parsedHeight * lockedAspectRatio)
      // Ensure width is divisible by 64
      const adjustedWidth = Math.round(newWidth / 64) * 64
      if (adjustedWidth >= 64) {
        setWidth(adjustedWidth)
      }
    }
    setHeight(parsedHeight)
  }

  // Handle wheel events for aspect ratio maintenance
  const handleWheel = (e: React.WheelEvent, isWidth: boolean): void => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -64 : 64 // Scroll up increases, down decreases
    if (isWidth) {
      const newWidth = Math.max(64, width + delta)
      handleWidthChange(newWidth)
    } else {
      const newHeight = Math.max(64, height + delta)
      handleHeightChange(newHeight)
    }
  }

  // Handle keyboard events for aspect ratio maintenance
  const handleKeyDown = (e: React.KeyboardEvent, isWidth: boolean): void => {
    if (e.key === 'ArrowUp' || e.key === '+') {
      e.preventDefault()
      if (isWidth) {
        handleWidthChange(Math.max(64, width + 64))
      } else {
        handleHeightChange(Math.max(64, height + 64))
      }
    } else if (e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault()
      if (isWidth) {
        handleWidthChange(Math.max(64, width - 64))
      } else {
        handleHeightChange(Math.max(64, height - 64))
      }
    }
  }

  return (
    <div className={cn("cursor-pointer group p-4", className)} onClick={handleToggle}>
      {/* Collapsed State - Header with width/height inputs */}
      {collapsed ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <label className="studio-label">Dimensions</label>
            <ChevronDown size={16} className="text-studio-textSecondary group-hover:text-studio-text transition-colors" />
          </div>

          {/* Width and Height inputs with Lock Button */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="studio-label text-xs">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                onWheel={(e) => handleWheel(e, true)}
                onKeyDown={(e) => handleKeyDown(e, true)}
                min="64"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>

            <div className="flex flex-col items-center gap-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAspectRatioLockToggle()
                }}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  aspectRatioLocked
                    ? "text-studio-accent hover:bg-studio-accent/10"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                type="button"
              >
                {aspectRatioLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <span className="text-xs text-studio-textSecondary">AR</span>
            </div>

            <div className="flex-1">
              <label className="studio-label text-xs">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                onWheel={(e) => handleWheel(e, false)}
                onKeyDown={(e) => handleKeyDown(e, false)}
                min="64"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>
          </div>

          {/* Match Source Resolution Button */}
          {inputImage && (
            <button
              onClick={(e) => {
                e.stopPropagation() // Prevent toggling when clicking button
                matchSourceResolution()
              }}
              className="studio-btn-secondary w-full py-2 px-3 text-sm transition-all duration-200 hover:bg-studio-panelHover"
              title="Match the resolution of the input image"
              type="button"
            >
              Match Source Resolution
            </button>
          )}
        </div>
      ) : (
        /* Expanded State - Full component */
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <label className="studio-label">Dimensions</label>
            <ChevronUp size={16} className="text-studio-textSecondary group-hover:text-studio-text transition-colors" />
          </div>

          {/* Width and Height inputs with Lock Button */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="studio-label text-xs">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                onWheel={(e) => handleWheel(e, true)}
                onKeyDown={(e) => handleKeyDown(e, true)}
                min="64"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>

            <div className="flex flex-col items-center gap-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAspectRatioLockToggle()
                }}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  aspectRatioLocked
                    ? "text-studio-accent hover:bg-studio-accent/10"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                type="button"
              >
                {aspectRatioLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <span className="text-xs text-studio-textSecondary">AR</span>
            </div>

            <div className="flex-1">
              <label className="studio-label text-xs">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                onWheel={(e) => handleWheel(e, false)}
                onKeyDown={(e) => handleKeyDown(e, false)}
                min="64"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>
          </div>

          {/* Match Source Resolution Button */}
          {inputImage && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation() // Prevent toggling when clicking button
                  matchSourceResolution()
                }}
                className="studio-btn-secondary w-full py-2 px-3 text-sm transition-all duration-200 hover:bg-studio-panelHover"
                title="Match the resolution of the input image"
                type="button"
              >
                Match Source Resolution
              </button>
            </div>
          )}

          {/* Aspect Ratio Picker */}
          <div>
            <label className="studio-label">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              {aspectRatios.map((aspect) => (
                <button
                  key={aspect.ratio}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent toggling when clicking buttons
                    setSelectedAspectRatio(aspect.ratio)
                  }}
                  className={cn(
                    "studio-btn-secondary text-xs py-2 px-3 transition-all duration-200",
                    selectedAspectRatio === aspect.ratio
                      ? "bg-studio-accent text-black border-studio-accent shadow-lg font-semibold"
                      : "hover:bg-studio-panelHover"
                  )}
                  type="button"
                >
                  {aspect.name}
                  <br />
                  <span className="text-studio-textSecondary">{aspect.ratio}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Resolutions */}
          <div>
            <label className="studio-label">Resolutions ({selectedAspectRatio})</label>
            <div className="grid grid-cols-2 gap-2">
              {availableResolutions.map((resolution) => (
                <button
                  key={`${resolution.w}x${resolution.h}`}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent toggling when clicking buttons
                    setWidth(resolution.w)
                    setHeight(resolution.h)
                  }}
                  className={cn(
                    "studio-btn-secondary text-xs py-2 px-3 transition-all duration-200",
                    width === resolution.w && height === resolution.h
                      ? "bg-studio-accent text-black border-studio-accent shadow-lg font-semibold"
                      : "hover:bg-studio-panelHover"
                  )}
                  type="button"
                >
                  {resolution.w}×{resolution.h}
                  <br />
                  <span className="text-studio-textSecondary">
                    {((resolution.w * resolution.h) / 1000000).toFixed(1)}MP
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResolutionPicker
