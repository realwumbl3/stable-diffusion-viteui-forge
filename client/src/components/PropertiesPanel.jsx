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
import ResolutionPicker from './ResolutionPicker.jsx'

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
  setSaveImages,
  // Inpainting parameters
  inpaintMask,
  setInpaintMask,
  maskBlur,
  setMaskBlur,
  inpaintingFill,
  setInpaintingFill,
  inpaintFullRes,
  setInpaintFullRes,
  inpaintingMaskInvert,
  setInpaintingMaskInvert
}) => {
  const [activeSection, setActiveSection] = useState('model')

  const sections = [
    { id: 'model', icon: Settings, label: 'Model', description: 'AI model settings' },
    { id: 'generation', icon: Sliders, label: 'Generation, parameters', description: 'All generation settings' },
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

                {/* Resolution Picker */}
                <ResolutionPicker
                  width={width}
                  setWidth={setWidth}
                  height={height}
                  setHeight={setHeight}
                  inputImage={inputImage}
                />

                {/* Inpainting Controls */}
                {generationMode === 'inpaint' && (
                  <>
                    <div>
                      <label className="studio-label">Mask Blur</label>
                      <input
                        type="range"
                        min="0"
                        max="64"
                        step="1"
                        value={maskBlur}
                        onChange={(e) => setMaskBlur(parseInt(e.target.value))}
                        className="studio-slider w-full"
                      />
                      <div className="flex justify-between text-xs text-studio-textSecondary mt-1">
                        <span>0</span>
                        <span className="font-medium">{maskBlur}px</span>
                        <span>64</span>
                      </div>
                      <p className="text-xs text-studio-text-muted mt-1">
                        Blurs the edges of the mask for smoother transitions
                      </p>
                    </div>

                    <div>
                      <label className="studio-label">Masked Content</label>
                      <select
                        value={inpaintingFill}
                        onChange={(e) => setInpaintingFill(parseInt(e.target.value))}
                        className="studio-select w-full"
                      >
                        <option value={0}>Fill - Generate new content</option>
                        <option value={1}>Original - Keep original image</option>
                        <option value={2}>Latent Noise - Use latent noise</option>
                        <option value={3}>Latent Nothing - Use empty latent</option>
                      </select>
                      <p className="text-xs text-studio-text-muted mt-1">
                        What to do with the masked area
                      </p>
                    </div>

                    <div>
                      <label className="studio-label">Denoise Strength</label>
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
                        Controls how much the masked area is changed (higher = more creative)
                      </p>
                    </div>

                    <div>
                      <label className="studio-label">Inpaint at Full Resolution</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="inpaint-full-res-toggle"
                          checked={inpaintFullRes}
                          onChange={(e) => setInpaintFullRes(e.target.checked)}
                          className="w-4 h-4 text-studio-accent bg-studio-bg border-studio-border rounded focus:ring-studio-accent focus:ring-2"
                        />
                        <label htmlFor="inpaint-full-res-toggle" className="text-sm text-studio-text cursor-pointer">
                          Process masked area at full resolution
                        </label>
                      </div>
                    </div>


                    <div>
                      <label className="studio-label">Invert Mask</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="invert-mask-toggle"
                          checked={inpaintingMaskInvert}
                          onChange={(e) => setInpaintingMaskInvert(e.target.checked)}
                          className="w-4 h-4 text-studio-accent bg-studio-bg border-studio-border rounded focus:ring-studio-accent focus:ring-2"
                        />
                        <label htmlFor="invert-mask-toggle" className="text-sm text-studio-text cursor-pointer">
                          Invert the mask (paint what to keep instead)
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="studio-label">Mask Upload</label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (e) => setInpaintMask(e.target.result)
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="w-full text-sm text-studio-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-studio-accent file:text-studio-bg hover:file:bg-studio-accent/80"
                        />
                        {inpaintMask && (
                          <div className="relative">
                            <img
                              src={inpaintMask}
                              alt="Mask"
                              className="w-full h-20 object-cover rounded-lg border border-studio-border"
                            />
                            <button
                              onClick={() => setInpaintMask(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-studio-text-muted mt-1">
                        Upload a pre-made mask image (optional)
                      </p>
                    </div>
                  </>
                )}
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