import { useState, useEffect } from 'react'
import api from './api.js'
import { cn } from './lib/utils.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import { useWebSocketProgress } from './hooks/useWebSocketProgress.js'
import { ComposerProvider } from './stores/composerStore.tsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Canvas from './components/Canvas.jsx'
import PropertiesPanel from './components/PropertiesPanel.jsx'
import Welcome from './components/Welcome.jsx'

function App() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [images, setImages] = useState([])
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

  // Generation parameters
  const [generationMode, setGenerationMode] = useState('txt2img')

  const handleGenerationModeChange = (mode) => {
    setGenerationMode(mode)
  }
  const [steps, setSteps] = useState(20)
  const [cfgScale, setCfgScale] = useState(7)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [batchSize, setBatchSize] = useState(1)

  // img2img parameters
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [inputImage, setInputImage] = useState(null)

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false)
  const [activeTool, setActiveTool] = useState('generate')
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [modelsData, samplersData] = await Promise.all([
        api.getModels(),
        api.getSamplers()
      ])

      setModels(modelsData)
      setSamplers(samplersData)

      // Set default model if available
      if (modelsData.length > 0) {
        setSelectedModel(modelsData[0].title)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const generateImage = async () => {
    if (!prompt.trim()) return
    if (generationMode === 'img2img' && !inputImage) {
      alert('Please upload an input image for img2img mode.')
      return
    }

    setLoading(true)
    setCurrentTaskId(null) // Clear previous task ID

    // Generate task ID first and establish WebSocket connection
    const taskId = `task(${generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    setCurrentTaskId(taskId) // Connect WebSocket before API call

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
        n_iter: 1,
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
      } else {
        data = await api.txt2imgSimple(baseParams)
      }

      if (data.images && data.images.length > 0) {
        const newImages = data.images.map(img => `data:image/png;base64,${img}`)
        setImages(prev => [...prev, ...newImages])
        setCurrentImage(newImages[0])
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

  const handleImageSelect = (imageSrc) => {
    setCurrentImage(imageSrc)
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
    'ctrl+b': () => setSidebarCollapsed(!sidebarCollapsed),
    'ctrl+p': () => setPropertiesCollapsed(!propertiesCollapsed),
    'ctrl+1': () => setActiveTool('generate'),
    'ctrl+2': () => setActiveTool('edit'),
    'ctrl+3': () => setActiveTool('layers'),
    'ctrl+4': () => setActiveTool('image'),
  })

  // Show welcome screen if no images have been generated and user hasn't dismissed it
  if (showWelcome && images.length === 0) {
    return (
      <ComposerProvider>
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
          />

          {/* Welcome Screen */}
          <Welcome onGetStarted={handleGetStarted} />
        </div>
      </ComposerProvider>
    )
  }

  return (
    <ComposerProvider>
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            images={images}
            currentImage={currentImage}
            onImageSelect={handleImageSelect}
          />

          {/* Main Canvas Area */}
          <Canvas
            currentImage={currentImage}
            livePreview={livePreview}
            loading={loading}
            progress={progress}
            prompt={prompt}
            setPrompt={setPrompt}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
          />

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
            denoisingStrength={denoisingStrength}
            setDenoisingStrength={setDenoisingStrength}
            inputImage={inputImage}
            onImageUpload={setInputImage}
          />
        </div>
      </div>
    </ComposerProvider>
  )
}

export default App