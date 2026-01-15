import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Image as ImageIcon,
  Sliders,
  Palette,
  Type,
  Layers,
  Wand2
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const PropertiesPanel = ({
  collapsed,
  onToggle,
  // Generation settings
  generationMode,
  setGenerationMode,
  models,
  selectedModel,
  onModelChange,
  samplers,
  selectedSampler,
  setSelectedSampler,
  steps,
  setSteps,
  cfgScale,
  setCfgScale,
  width,
  setWidth,
  height,
  setHeight,
  batchSize,
  setBatchSize,
  count,
  setCount,
  denoisingStrength,
  setDenoisingStrength,
  inputImage,
  onImageUpload,
  clipSkip,
  setClipSkip,
  saveImages,
  setSaveImages
}) => {
  const [activeSection, setActiveSection] = useState('model')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')

  const sections = [
    { id: 'model', icon: Settings, label: 'Model', description: 'AI model settings' },
    { id: 'generation', icon: Sliders, label: 'Generation, parameters', description: 'All generation settings' },
  ]

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

  return (
    <aside className={cn(
      "studio-properties-panel relative overflow-hidden transition-all duration-300 ease-in-out",
      collapsed ? "w-12" : "w-80"
    )}>
      {/* Always-full-width Content Container */}
      <div className="w-80 h-full">
        {/* Collapsed Icon List */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center gap-4 py-6 px-2 transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                onToggle()
              }}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110",
                activeSection === section.id
                  ? "bg-studio-accent text-black shadow-lg font-semibold"
                  : "bg-studio-panel text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
              )}
              title={section.label}
            >
              <section.icon size={20} />
            </button>
          ))}
        </div>

        {/* Expanded Content */}
        <div className={cn(
          "h-full flex flex-col transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          {/* Properties Header */}
          <div className="studio-sidebar-header">
            <h3 className="text-studio-text font-semibold text-sm">Properties</h3>
          </div>

          {/* Section Navigation */}
          <div className="px-4 pb-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeSection === section.id
                    ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
              >
                <section.icon size={16} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{section.label}</div>
                  <div className="text-xs opacity-70 truncate">{section.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Properties Content */}
          <div className="studio-sidebar-content !overflow-y-auto">
            <div className="p-4 space-y-6">
            {/* Model Section */}
            {activeSection === 'model' && (
              <div className="space-y-4">
                <div>
                  <label className="studio-label">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="studio-select w-full"
                  >
                    {models.map(model => (
                      <option key={model.title} value={model.title}>
                        {model.model_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="studio-label">Clip Skip</label>
                  <input
                    type="number"
                    value={clipSkip}
                    onChange={(e) => setClipSkip(parseInt(e.target.value))}
                    min="1"
                    max="12"
                    className="studio-input w-full"
                  />
                </div>
              </div>
            )}

            {/* Generation, parameters Section */}
            {activeSection === 'generation' && (
              <div className="space-y-6">
                {generationMode === 'img2img' && (
                  <>
                    <div>
                      <label className="studio-label">Input Image</label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (e) => onImageUpload(e.target.result)
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="w-full text-sm text-studio-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-studio-accent file:text-studio-bg hover:file:bg-studio-accent/80"
                        />
                        {inputImage && (
                          <div className="relative">
                            <img
                              src={inputImage}
                              alt="Input"
                              className="w-full h-32 object-cover rounded-lg border border-studio-border"
                            />
                            <button
                              onClick={() => onImageUpload(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="studio-label">Denoising Strength</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={denoisingStrength}
                        onChange={(e) => setDenoisingStrength(parseFloat(e.target.value))}
                        className="studio-slider w-full"
                      />
                      <div className="flex justify-between text-xs text-studio-textSecondary mt-1">
                        <span>0.0</span>
                        <span className="font-medium">{denoisingStrength.toFixed(2)}</span>
                        <span>1.0</span>
                      </div>
                      <p className="text-xs text-studio-text-muted mt-1">
                        Higher values = more creative changes, lower values = more faithful to original
                      </p>
                    </div>
                  </>
                )}

                {/* Sampler */}
                <div>
                  <label className="studio-label">Sampler</label>
                  <select
                    value={selectedSampler}
                    onChange={(e) => setSelectedSampler(e.target.value)}
                    className="studio-select w-full"
                  >
                    {samplers.map(sampler => (
                      <option key={sampler.name} value={sampler.name}>
                        {sampler.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generation Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="studio-label">Steps</label>
                    <input
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      min="1"
                      max="100"
                      className="studio-input w-full"
                    />
                  </div>

                  <div>
                    <label className="studio-label">CFG Scale</label>
                    <input
                      type="number"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                      min="1"
                      max="30"
                      step="0.1"
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {/* Batch Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="studio-label">Batch Size</label>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      min="1"
                      max="8"
                      className="studio-input w-full"
                    />
                  </div>

                  <div>
                    <label className="studio-label">Count</label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      min="1"
                      max="50"
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {/* Save to Output Folder */}
                <div>
                  <label className="studio-label">Save Options</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="save-images-toggle"
                      checked={saveImages}
                      onChange={(e) => setSaveImages(e.target.checked)}
                      className="w-4 h-4 text-studio-accent bg-studio-bg border-studio-border rounded focus:ring-studio-accent focus:ring-2"
                    />
                    <label htmlFor="save-images-toggle" className="text-sm text-studio-text cursor-pointer">
                      Save to output folder
                    </label>
                  </div>
                  <p className="text-xs text-studio-text-muted mt-1">
                    When enabled, generated images will be saved to the server's output directory
                  </p>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="studio-label">Dimensions</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="studio-label text-xs">Width</label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value))}
                        min="512"
                        max="2048"
                        step="64"
                        className="studio-input w-full"
                      />
                    </div>

                    <div>
                      <label className="studio-label text-xs">Height</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value))}
                        min="512"
                        max="2048"
                        step="64"
                        className="studio-input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Picker */}
                <div>
                  <label className="studio-label">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-2">
                    {aspectRatios.map((aspect) => (
                      <button
                        key={aspect.ratio}
                        onClick={() => setSelectedAspectRatio(aspect.ratio)}
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
                        onClick={() => {
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
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -right-4 w-8 h-8 bg-studio-panel border border-studio-border rounded-full flex items-center justify-start hover:bg-studio-panelHover transition-all duration-200 shadow-studio"
      >
        <ChevronRight size={16} className="transition-transform duration-200" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
    </aside>
  )
}

export default PropertiesPanel