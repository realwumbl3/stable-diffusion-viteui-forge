import { useState, useEffect } from 'react'
import api from './api.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import { useWebSocketProgress } from './hooks/useWebSocketProgress.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Canvas from './components/Canvas.jsx'
import InpaintCanvas from './components/InpaintCanvas.jsx'
import PropertiesPanel from './components/PropertiesPanel.jsx'
import Welcome from './components/Welcome.jsx'

function App() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [currentTaskId, setCurrentTaskId] = useState(null)

  // WebSocket progress tracking
  const { progress, isConnected, livePreview } = useWebSocketProgress(currentTaskId)

  // Model and sampler settings
  const [models, setModels] = useState([])
  const [samplers, setSamplers] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedSampler, setSelectedSampler] = useState('Euler a')
  const [clipSkip, setClipSkip] = useState(1)

  // Generation parameters
  const [generationMode, setGenerationMode] = useState('txt2img')

  const handleGenerationModeChange = (mode) => {
    setGenerationMode(mode)
    // When switching to inpaint mode, force edit mode for mask editing
    if (mode === 'inpaint') {
      setForceInpaintEditMode(true)
      // Reset after a short delay to allow the effect to take place
      setTimeout(() => setForceInpaintEditMode(false), 100)
    } else {
      setForceInpaintEditMode(false)
    }
  }

  // Inpainting parameters
  const [inpaintMask, setInpaintMask] = useState(null)
  const [maskBlur, setMaskBlur] = useState(4)
  const [inpaintingFill, setInpaintingFill] = useState(0)
  const [inpaintFullRes, setInpaintFullRes] = useState(true)
  const [inpaintFullResPadding, setInpaintFullResPadding] = useState(0)
  const [inpaintingMaskInvert, setInpaintingMaskInvert] = useState(false)
  const [steps, setSteps] = useState(20)
  const [cfgScale, setCfgScale] = useState(7)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [batchSize, setBatchSize] = useState(1)
  const [count, setCount] = useState(1)

  // img2img parameters
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [inputImage, setInputImage] = useState(null)

  const [timeline, setTimeline] = useState({
    generationQueue: [],
    currentPreview: null,
    committedHistory: [],
    discarded: []
  })

  // Save settings
  const [saveImages, setSaveImages] = useState(true)
  const [saveGrids, setSaveGrids] = useState(false)

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false)
  const [activeTool, setActiveTool] = useState('generate')
  const [showWelcome, setShowWelcome] = useState(true)
  const [forceInpaintEditMode, setForceInpaintEditMode] = useState(false)
  const [preserveInpaintMask, setPreserveInpaintMask] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [modelsData, samplersData, optionsData] = await Promise.all([
        api.getModels(),
        api.getSamplers(),
        api.getOptions()
      ])

      setModels(modelsData)
      setSamplers(samplersData)

      // Set currently loaded model
      const currentModelTitle = optionsData.sd_model_checkpoint
      if (currentModelTitle) {
        // Find the model in the list that matches the current title (which includes hash)
        const currentModel = modelsData.find(model => model.title === currentModelTitle)
        if (currentModel) {
          setSelectedModel(currentModel.title)
        } else {
          // If we can't find the exact match, try to find by hash or model name
          const hashMatch = currentModelTitle.match(/\[([a-f0-9]+)\]$/)
          if (hashMatch) {
            const hash = hashMatch[1]
            const fallbackModel = modelsData.find(model => model.hash === hash || model.title.includes(hash))
            if (fallbackModel) {
              setSelectedModel(fallbackModel.title)
            } else if (modelsData.length > 0) {
              // Last resort: use first model
              setSelectedModel(modelsData[0].title)
            }
          } else if (modelsData.length > 0) {
            // Last resort: use first model
            setSelectedModel(modelsData[0].title)
          }
        }
      } else if (modelsData.length > 0) {
        // Fallback to first model if no current model is set
        setSelectedModel(modelsData[0].title)
      }

      // Set currently loaded clip skip
      const currentClipSkip = optionsData.CLIP_stop_at_last_layers
      console.log('currentClipSkip', currentClipSkip)
      if (currentClipSkip !== undefined && currentClipSkip !== null) {
        setClipSkip(parseInt(currentClipSkip))
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const createTimelineItem = (image, overrides = {}) => ({
    id: `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    image,
    createdAt: Date.now(),
    ...overrides
  })

  const appendCommittedImage = (history, image, source) => {
    if (!image) return history
    if (history[0]?.image === image) return history
    return [createTimelineItem(image, { source }), ...history]
  }

  const generateImage = async () => {
    if (!prompt.trim()) return
    if ((generationMode === 'img2img' || generationMode === 'inpaint') && !inputImage) {
      alert('Please upload an input image for img2img/inpaint mode.')
      return
    }
    if (generationMode === 'inpaint' && !inpaintMask) {
      alert('Please draw or upload a mask for inpainting mode.')
      return
    }

    setLoading(true)
    setCurrentTaskId(null) // Clear previous task ID

    // Generate task ID first
    const taskId = `task(${generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`

    // Establish WebSocket connection first and wait for it to be ready
    setCurrentTaskId(taskId)

    // Wait a bit for WebSocket connection to establish
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const baseParams = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        steps: steps,
        width: width,
        height: height,
        cfg_scale: cfgScale,
        sampler_name: selectedSampler,
        batch_size: batchSize,
        n_iter: count,
        clip_skip: clipSkip,
        save_images: saveImages,
        save_grids: saveGrids,
        force_task_id: taskId, // Use the same task ID
      }

      let data
      if (generationMode === 'img2img') {
        // Extract base64 data from data URL
        const base64Data = inputImage.split(',')[1]
        const img2imgParams = {
          ...baseParams,
          init_images: [base64Data],
          denoising_strength: denoisingStrength,
        }
        data = await api.img2img(img2imgParams)
      } else if (generationMode === 'inpaint') {
        // Extract base64 data from data URLs
        const base64Data = inputImage.split(',')[1]
        const maskBase64Data = inpaintMask.split(',')[1]
        const inpaintParams = {
          ...baseParams,
          init_images: [base64Data],
          mask: maskBase64Data,
          mask_blur: maskBlur,
          inpainting_fill: inpaintingFill,
          inpaint_full_res: inpaintFullRes,
          inpaint_full_res_padding: inpaintFullResPadding,
          inpainting_mask_invert: inpaintingMaskInvert ? 1 : 0,
          denoising_strength: denoisingStrength,
        }
        data = await api.img2img(inpaintParams)
      } else {
        data = await api.txt2imgSimple(baseParams)
      }

      if (data.images && data.images.length > 0) {
        const newImages = data.images.map(img => `data:image/png;base64,${img}`)
        const timelineItems = newImages.map(image => (
          createTimelineItem(image, {
            source: 'generation',
            type: generationMode,
            prompt,
            negativePrompt,
            parameters: {
              steps,
              cfgScale,
              width,
              height,
              sampler: selectedSampler,
              denoisingStrength
            }
          })
        ))
        setTimeline(prev => ({
          ...prev,
          generationQueue: [...timelineItems, ...prev.generationQueue],
          currentPreview: prev.currentPreview ?? timelineItems[0]
        }))
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error generating image. Make sure the API server is running on port 7861.')
    } finally {
      setLoading(false)
      setCurrentTaskId(null) // Clear task ID when done
    }
  }

  const handleModelChange = async (modelTitle) => {
    setSelectedModel(modelTitle)
    try {
      await api.setModel(modelTitle)
    } catch (error) {
      console.error('Error setting model:', error)
    }
  }

  const handleClipSkipChange = async (newClipSkip) => {
    setClipSkip(newClipSkip)
    try {
      await api.setOptions({ CLIP_stop_at_last_layers: newClipSkip })
    } catch (error) {
      console.error('Error setting clip skip:', error)
    }
  }

  const handleSkip = async () => {
    try {
      console.log('Skipping generation')
      await api.skip()
      console.log('Generation skipped')
    } catch (error) {
      console.error('Error skipping generation:', error)
    }
  }

  const handleInterrupt = async () => {
    try {
      await api.interrupt()
      console.log('Generation interrupted')
    } catch (error) {
      console.error('Error interrupting generation:', error)
    }
  }

  const handleCanvasImageUpload = (imageSrc) => {
    setInputImage(imageSrc)
    setTimeline(prev => {
      let committedHistory = prev.committedHistory
      if (currentImage && currentImage !== imageSrc) {
        committedHistory = appendCommittedImage(committedHistory, currentImage, 'canvas')
      }
      committedHistory = appendCommittedImage(committedHistory, imageSrc, 'upload')
      return {
        ...prev,
        committedHistory
      }
    })
    setCurrentImage(imageSrc)
  }

  const handlePreviewSelect = (item) => {
    setTimeline(prev => ({
      ...prev,
      currentPreview: item
    }))
  }

  const handleRejectPreview = () => {
    setTimeline(prev => {
      const preview = prev.currentPreview
      if (!preview) return prev
      if (preview.source === 'generation') {
        const remainingQueue = prev.generationQueue.filter(item => item.id !== preview.id)
        return {
          ...prev,
          generationQueue: remainingQueue,
          discarded: [preview, ...prev.discarded],
          currentPreview: remainingQueue.length > 0 ? remainingQueue[0] : null
        }
      }
      return {
        ...prev,
        currentPreview: null
      }
    })
  }

  const handleCommitPreview = () => {
    const preview = timeline.currentPreview
    if (!preview) return

    setTimeline(prev => {
      let committedHistory = prev.committedHistory
      if (currentImage && currentImage !== preview.image) {
        committedHistory = appendCommittedImage(committedHistory, currentImage, 'canvas')
      }

      if (preview.source === 'generation') {
        const remainingQueue = prev.generationQueue.filter(item => item.id !== preview.id)
        // Add the committed generation to the top of committed history
        const newCommittedItem = {
          id: preview.id,
          image: preview.image,
          timestamp: Date.now(),
          type: preview.type || 'generation',
          source: 'committed'
        }
        return {
          ...prev,
          generationQueue: [],
          discarded: [...remainingQueue, ...prev.discarded],
          committedHistory: [newCommittedItem, ...committedHistory],
          currentPreview: null
        }
      }

      return {
        ...prev,
        committedHistory,
        currentPreview: null
      }
    })

    setCurrentImage(preview.image)
    if (generationMode === 'inpaint') {
      setPreserveInpaintMask(true)
      setInputImage(preview.image)
      // Reset the flag after a short delay
      setTimeout(() => setPreserveInpaintMask(false), 100)
    } else if (generationMode !== 'txt2img') {
      setInputImage(preview.image)
    }
  }

  const handleDiscardGeneration = (item) => {
    setTimeline(prev => ({
      ...prev,
      generationQueue: prev.generationQueue.filter(entry => entry.id !== item.id),
      discarded: [item, ...prev.discarded],
      currentPreview: prev.currentPreview?.id === item.id ? null : prev.currentPreview
    }))
  }

  const handleRestoreGeneration = (item) => {
    setTimeline(prev => ({
      ...prev,
      discarded: prev.discarded.filter(entry => entry.id !== item.id),
      generationQueue: [item, ...prev.generationQueue],
      currentPreview: item // Automatically select the restored item for preview
    }))
  }

  const handleGetStarted = (templatePrompt = '') => {
    if (templatePrompt) {
      setPrompt(templatePrompt)
    }
    setShowWelcome(false)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+g': () => {
      if (prompt.trim() && !loading) {
        generateImage()
      }
    },
    'alt+t': () => handleGenerationModeChange('txt2img'),
    'alt+i': () => handleGenerationModeChange('img2img'),
    'alt+n': () => handleGenerationModeChange('inpaint'),
    'ctrl+b': () => setSidebarCollapsed(!sidebarCollapsed),
    'ctrl+p': () => setPropertiesCollapsed(!propertiesCollapsed),
    'ctrl+1': () => setActiveTool('generate'),
    'ctrl+2': () => setActiveTool('edit'),
    'ctrl+3': () => setActiveTool('layers'),
    'ctrl+4': () => setActiveTool('image'),
  })

  // Show welcome screen if no images have been generated and user hasn't dismissed it
  const hasTimelineContent = Boolean(
    currentImage ||
    timeline.currentPreview ||
    timeline.generationQueue.length ||
    timeline.committedHistory.length ||
    timeline.discarded.length
  )

  if (showWelcome && !hasTimelineContent) {
    return (
      <div className="h-screen flex flex-col bg-studio-bg">
        {/* Header Toolbar */}
        <Header
          loading={loading}
          progress={progress}
          onGenerate={generateImage}
          canGenerate={!!prompt.trim()}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          onSkip={handleSkip}
          onInterrupt={handleInterrupt}
        />

        {/* Welcome Screen */}
        <Welcome onGetStarted={handleGetStarted} />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-studio-bg">
      {/* Header Toolbar */}
      <Header
        loading={loading}
        progress={progress}
        onGenerate={generateImage}
        canGenerate={!!prompt.trim()}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        generationMode={generationMode}
        setGenerationMode={handleGenerationModeChange}
        onSkip={handleSkip}
        onInterrupt={handleInterrupt}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          timeline={timeline}
          currentImage={currentImage}
          onPreviewSelect={handlePreviewSelect}
          onCommitPreview={handleCommitPreview}
          onRejectPreview={handleRejectPreview}
          onDiscardGeneration={handleDiscardGeneration}
          onRestoreGeneration={handleRestoreGeneration}
          onGenerationModeChange={handleGenerationModeChange}
        />

        {/* Main Canvas Area */}
        {generationMode === 'inpaint' ? (
          <InpaintCanvas
            currentImage={currentImage}
            previewImage={timeline.currentPreview?.image}
            inputImage={inputImage}
            livePreview={livePreview}
            loading={loading}
            progress={progress}
            generationWidth={width}
            generationHeight={height}
            prompt={prompt}
            setPrompt={setPrompt}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            inpaintMask={inpaintMask}
            setInpaintMask={setInpaintMask}
            onImageUpload={handleCanvasImageUpload}
            inpaintFullRes={inpaintFullRes}
            inpaintFullResPadding={inpaintFullResPadding}
            setInpaintFullResPadding={setInpaintFullResPadding}
            forceEditMode={forceInpaintEditMode}
            preserveMaskOnImageChange={preserveInpaintMask}
          />
        ) : (
          <Canvas
            currentImage={currentImage}
            previewImage={timeline.currentPreview?.image}
            livePreview={livePreview}
            loading={loading}
            progress={progress}
            generationWidth={width}
            generationHeight={height}
            prompt={prompt}
            setPrompt={setPrompt}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            generationMode={generationMode}
            inputImage={generationMode === 'img2img' ? inputImage : null}
            onImageUpload={generationMode === 'img2img' ? handleCanvasImageUpload : null}
          />
        )}

        {/* Right Properties Panel */}
        <PropertiesPanel
          collapsed={propertiesCollapsed}
          onToggle={() => setPropertiesCollapsed(!propertiesCollapsed)}
          // Generation settings
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          models={models}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          samplers={samplers}
          selectedSampler={selectedSampler}
          setSelectedSampler={setSelectedSampler}
          steps={steps}
          setSteps={setSteps}
          cfgScale={cfgScale}
          setCfgScale={setCfgScale}
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          count={count}
          setCount={setCount}
          denoisingStrength={denoisingStrength}
          setDenoisingStrength={setDenoisingStrength}
          inputImage={inputImage}
          onImageUpload={handleCanvasImageUpload}
          clipSkip={clipSkip}
          onClipSkipChange={handleClipSkipChange}
          saveImages={saveImages}
          setSaveImages={setSaveImages}
          saveGrids={saveGrids}
          setSaveGrids={setSaveGrids}
          // Inpainting parameters
          inpaintMask={inpaintMask}
          setInpaintMask={setInpaintMask}
          maskBlur={maskBlur}
          setMaskBlur={setMaskBlur}
          inpaintingFill={inpaintingFill}
          setInpaintingFill={setInpaintingFill}
          inpaintFullRes={inpaintFullRes}
          setInpaintFullRes={setInpaintFullRes}
          inpaintingMaskInvert={inpaintingMaskInvert}
          setInpaintingMaskInvert={setInpaintingMaskInvert}
        />
      </div>
    </div>
  )
}

export default App