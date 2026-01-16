import { useState } from 'react'
import { ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react'
import { cn } from '../lib/utils.js'

const ResolutionPicker = ({
  width,
  setWidth,
  height,
  setHeight,
  collapsed: externalCollapsed,
  onToggleCollapsed,
  className,
  inputImage
}) => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)

  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const handleToggle = onToggleCollapsed || (() => setInternalCollapsed(!internalCollapsed))

  // Common aspect ratios
  const aspectRatios = [
    { ratio: '1:1', name: 'Square', width: 1, height: 1 },
    { ratio: '4:3', name: 'Standard', width: 4, height: 3 },
    { ratio: '3:2', name: 'Classic', width: 3, height: 2 },
    { ratio: '16:9', name: 'Widescreen', width: 16, height: 9 },
    { ratio: '21:9', name: 'Ultrawide', width: 21, height: 9 },
    { ratio: '2:3', name: 'Portrait', width: 2, height: 3 },
    { ratio: '3:4', name: 'Tall Portrait', width: 3, height: 4 },
    { ratio: '9:16', name: 'Mobile', width: 9, height: 16 },
  ]

  // Generate resolutions based on aspect ratio from 512 to 2048
  const getResolutionsForAspectRatio = (aspectRatio) => {
    const { width: wRatio, height: hRatio } = aspectRatio
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
    const divisor = gcd(wRatio, hRatio)
    const normalizedWidth = wRatio / divisor
    const normalizedHeight = hRatio / divisor

    const resolutions = []
    const baseSizes = [512, 768, 1024, 1280, 1536, 1792, 2048]

    baseSizes.forEach(base => {
      // For landscape ratios (width > height), use base for width
      // For portrait ratios (height > width), use base for height
      let w, h
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

      // Only add if within 512-2048 range and not duplicate
      if (w >= 512 && w <= 2048 && h >= 512 && h <= 2048) {
        const exists = resolutions.some(r => r.w === w && r.h === h)
        if (!exists) {
          resolutions.push({ w, h })
        }
      }
    })

    return resolutions.slice(0, 6) // Limit to 6 resolutions
  }

  const currentAspectRatio = aspectRatios.find(ar => ar.ratio === selectedAspectRatio)
  const availableResolutions = currentAspectRatio ? getResolutionsForAspectRatio(currentAspectRatio) : []

  // Function to match source image resolution
  const matchSourceResolution = () => {
    if (!inputImage) return

    const img = new Image()
    img.onload = () => {
      // Ensure dimensions are divisible by 64 (common SD requirement)
      const sourceWidth = Math.round(img.width / 64) * 64
      const sourceHeight = Math.round(img.height / 64) * 64

      // Clamp to reasonable ranges
      const clampedWidth = Math.max(512, Math.min(2048, sourceWidth))
      const clampedHeight = Math.max(512, Math.min(2048, sourceHeight))

      setWidth(clampedWidth)
      setHeight(clampedHeight)
    }
    img.src = inputImage
  }

  // Handle width change with aspect ratio locking
  const handleWidthChange = (newWidth) => {
    const parsedWidth = parseInt(newWidth)
    if (aspectRatioLocked && parsedWidth > 0) {
      // Calculate height maintaining aspect ratio
      const aspectRatio = height / width
      const newHeight = Math.round(parsedWidth * aspectRatio)
      // Ensure height is divisible by 64 and within bounds
      const adjustedHeight = Math.max(512, Math.min(2048, Math.round(newHeight / 64) * 64))
      setHeight(adjustedHeight)
    }
    setWidth(parsedWidth)
  }

  // Handle height change with aspect ratio locking
  const handleHeightChange = (newHeight) => {
    const parsedHeight = parseInt(newHeight)
    if (aspectRatioLocked && parsedHeight > 0) {
      // Calculate width maintaining aspect ratio
      const aspectRatio = width / height
      const newWidth = Math.round(parsedHeight * aspectRatio)
      // Ensure width is divisible by 64 and within bounds
      const adjustedWidth = Math.max(512, Math.min(2048, Math.round(newWidth / 64) * 64))
      setWidth(adjustedWidth)
    }
    setHeight(parsedHeight)
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
                min="512"
                max="2048"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>

            <div className="flex flex-col items-center gap-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAspectRatioLocked(!aspectRatioLocked)
                }}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  aspectRatioLocked
                    ? "text-studio-accent hover:bg-studio-accent/10"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
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
                min="512"
                max="2048"
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
                min="512"
                max="2048"
                step="64"
                className="studio-input w-full"
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inputs
              />
            </div>

            <div className="flex flex-col items-center gap-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAspectRatioLocked(!aspectRatioLocked)
                }}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  aspectRatioLocked
                    ? "text-studio-accent hover:bg-studio-accent/10"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
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
                min="512"
                max="2048"
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
              {availableResolutions.map((resolution, index) => (
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