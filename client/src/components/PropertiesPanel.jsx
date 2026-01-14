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
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
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
  setBatchSize
}) => {
  const [activeSection, setActiveSection] = useState('prompt')

  const sections = [
    { id: 'prompt', icon: Type, label: 'Prompt', description: 'Text input' },
    { id: 'model', icon: Settings, label: 'Model', description: 'AI model settings' },
    { id: 'generation', icon: Wand2, label: 'Generation', description: 'Parameters' },
    { id: 'dimensions', icon: ImageIcon, label: 'Dimensions', description: 'Size & format' },
    { id: 'advanced', icon: Sliders, label: 'Advanced', description: 'Fine tuning' },
  ]

  return (
    <aside className={cn(
      "studio-properties-panel transition-all duration-300 ease-in-out",
      collapsed && "w-12"
    )}>
      {/* Properties Header */}
      <div className="studio-sidebar-header">
        {!collapsed && (
          <h3 className="text-studio-text font-semibold text-sm">Properties</h3>
        )}
      </div>

      {/* Section Navigation */}
      {!collapsed && (
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
      )}

      {/* Properties Content */}
      <div className="studio-sidebar-content scrollbar-thin">
        {!collapsed && (
          <div className="p-4 space-y-6">
            {/* Prompt Section */}
            {activeSection === 'prompt' && (
              <div className="space-y-4">
                <div>
                  <label className="studio-label">Positive Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate... (e.g., 'a beautiful landscape, sunset, mountains')"
                    className="studio-textarea w-full resize-none"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="studio-label">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Describe what you don't want... (e.g., 'blurry, low quality, distorted')"
                    className="studio-textarea w-full resize-none"
                    rows={4}
                  />
                </div>
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
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -left-4 w-8 h-8 bg-studio-panel border border-studio-border rounded-full flex items-center justify-center hover:bg-studio-panelHover transition-colors shadow-studio"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}

export default PropertiesPanel