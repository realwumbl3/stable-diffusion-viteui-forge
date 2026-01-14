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
  denoisingStrength,
  setDenoisingStrength,
  inputImage,
  onImageUpload
}) => {
  const [activeSection, setActiveSection] = useState('mode')

  const sections = [
    { id: 'mode', icon: Wand2, label: 'Mode', description: 'Generation type' },
    { id: 'model', icon: Settings, label: 'Model', description: 'AI model settings' },
    { id: 'generation', icon: Wand2, label: 'Generation', description: 'Parameters' },
    { id: 'dimensions', icon: ImageIcon, label: 'Dimensions', description: 'Size & format' },
    { id: 'advanced', icon: Sliders, label: 'Advanced', description: 'Fine tuning' },
  ]

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
                  ? "bg-studio-accent text-studio-bg shadow-lg"
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
          "h-full transition-opacity duration-300 ease-in-out",
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
          <div className="studio-sidebar-content">
            <div className="p-4 space-y-6">
            {/* Mode Section */}
            {activeSection === 'mode' && (
              <div className="space-y-4">
                <div>
                  <label className="studio-label">Generation Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGenerationMode('txt2img')}
                      className={cn(
                        "studio-btn-secondary py-3 px-4 text-sm",
                        generationMode === 'txt2img' && "bg-studio-accent text-studio-bg border-studio-accent"
                      )}
                    >
                      <Type size={16} className="mx-auto mb-1" />
                      Text to Image
                    </button>
                    <button
                      onClick={() => setGenerationMode('img2img')}
                      className={cn(
                        "studio-btn-secondary py-3 px-4 text-sm",
                        generationMode === 'img2img' && "bg-studio-accent text-studio-bg border-studio-accent"
                      )}
                    >
                      <ImageIcon size={16} className="mx-auto mb-1" />
                      Image to Image
                    </button>
                  </div>
                </div>

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
              </div>
            )}


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
              </div>
            )}

            {/* Generation Section */}
            {activeSection === 'generation' && (
              <div className="space-y-4">
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
              </div>
            )}

            {/* Dimensions Section */}
            {activeSection === 'dimensions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="studio-label">Width</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      min="64"
                      max="2048"
                      step="64"
                      className="studio-input w-full"
                    />
                  </div>

                  <div>
                    <label className="studio-label">Height</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value))}
                      min="64"
                      max="2048"
                      step="64"
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {/* Preset Sizes */}
                <div>
                  <label className="studio-label">Quick Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Square', w: 512, h: 512 },
                      { name: 'Portrait', w: 512, h: 768 },
                      { name: 'Landscape', w: 768, h: 512 },
                      { name: 'HD', w: 1024, h: 1024 }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setWidth(preset.w)
                          setHeight(preset.h)
                        }}
                        className="studio-btn-secondary text-xs py-2 px-3"
                      >
                        {preset.name}
                        <br />
                        <span className="text-studio-textSecondary">{preset.w}×{preset.h}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Section */}
            {activeSection === 'advanced' && (
              <div className="space-y-4">
                <div className="text-center py-8 text-studio-text-muted">
                  <Sliders size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Advanced settings</p>
                  <p className="text-xs">Coming soon</p>
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