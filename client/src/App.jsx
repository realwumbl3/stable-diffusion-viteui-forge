import { useState, useEffect } from 'react'
import api from './api.js'
import { cn } from './lib/utils.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
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

  // Model and sampler settings
  const [models, setModels] = useState([])
  const [samplers, setSamplers] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedSampler, setSelectedSampler] = useState('Euler a')

  // Generation parameters
  const [steps, setSteps] = useState(20)
  const [cfgScale, setCfgScale] = useState(7)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [batchSize, setBatchSize] = useState(1)

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

    setLoading(true)
    try {
      const params = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        steps: steps,
        width: width,
        height: height,
        cfg_scale: cfgScale,
        sampler_name: selectedSampler,
        batch_size: batchSize,
        n_iter: 1,
      }

      const data = await api.txt2img(params)

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
      <div className="h-screen flex flex-col bg-studio-bg">
        {/* Header Toolbar */}
        <Header
          loading={loading}
          onGenerate={generateImage}
          canGenerate={!!prompt.trim()}
          activeTool={activeTool}
          onToolChange={setActiveTool}
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
        onGenerate={generateImage}
        canGenerate={!!prompt.trim()}
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setPropertiesCollapsed(!propertiesCollapsed)}
          images={images}
          currentImage={currentImage}
          onImageSelect={handleImageSelect}
        />

        {/* Main Canvas Area */}
        <Canvas
          currentImage={currentImage}
          loading={loading}
        />

        {/* Right Properties Panel */}
        <PropertiesPanel
          collapsed={propertiesCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          // Generation settings
          prompt={prompt}
          setPrompt={setPrompt}
          negativePrompt={negativePrompt}
          setNegativePrompt={setNegativePrompt}
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
        />
      </div>
    </div>
  )
}

export default App