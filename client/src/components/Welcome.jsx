import { useState } from 'react'
import {
  Sparkles,
  Wand2,
  Zap,
  Palette,
  Layers,
  Download,
  BookOpen,
  Settings
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const Welcome = ({ onGetStarted }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const templates = [
    {
      id: 'portrait',
      name: 'Portrait',
      description: 'Create beautiful character portraits',
      prompt: 'A highly detailed portrait of a person, professional photography, studio lighting, 8k resolution',
      icon: Palette
    },
    {
      id: 'landscape',
      name: 'Landscape',
      description: 'Generate stunning landscapes and scenery',
      prompt: 'A breathtaking landscape scene, mountains, sunset, dramatic lighting, highly detailed, 8k',
      icon: Layers
    },
    {
      id: 'abstract',
      name: 'Abstract Art',
      description: 'Create unique abstract compositions',
      prompt: 'Abstract art, vibrant colors, geometric shapes, modern style, artistic composition',
      icon: Sparkles
    },
    {
      id: 'fantasy',
      name: 'Fantasy',
      description: 'Bring fantasy worlds to life',
      prompt: 'Fantasy landscape, mystical atmosphere, magical elements, detailed artwork, cinematic lighting',
      icon: Wand2
    }
  ]

  const features = [
    { icon: Zap, title: 'Fast Generation', desc: 'Generate images in seconds with advanced AI' },
    { icon: Palette, title: 'Professional Quality', desc: 'Studio-grade results with fine-tuned controls' },
    { icon: Layers, title: 'Advanced Controls', desc: 'Full control over prompts, models, and parameters' },
    { icon: Download, title: 'Easy Export', desc: 'Save and export your creations instantly' }
  ]

  return (
    <div className="studio-canvas flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-studio-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wand2 size={32} className="text-studio-accent" />
          </div>
          <h1 className="text-4xl font-bold text-studio-text mb-4">
            Welcome to Stable Diffusion Studio
          </h1>
          <p className="text-xl text-studio-textSecondary max-w-2xl mx-auto">
            Create professional AI-generated images with our intuitive studio interface.
            Start with a template or build your own masterpiece.
          </p>
        </div>

        {/* Quick Start Templates */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-studio-text mb-6 text-center">
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "studio-panel p-6 text-left transition-all duration-200 hover:scale-105",
                  selectedTemplate?.id === template.id && "ring-2 ring-studio-accent border-studio-accent"
                )}
              >
                <template.icon size={24} className="text-studio-accent mb-3" />
                <h3 className="font-semibold text-studio-text mb-2">{template.name}</h3>
                <p className="text-sm text-studio-textSecondary">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Template Actions */}
        {selectedTemplate && (
          <div className="studio-panel p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-studio-text">
                Start with "{selectedTemplate.name}"
              </h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-studio-textSecondary hover:text-studio-text"
              >
                ×
              </button>
            </div>
            <p className="text-studio-textSecondary mb-4">{selectedTemplate.prompt}</p>
            <button
              onClick={() => onGetStarted(selectedTemplate.prompt)}
              className="studio-btn-primary flex items-center gap-2"
            >
              <Sparkles size={16} />
              Use This Template
            </button>
          </div>
        )}

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-studio-text mb-6 text-center">
            Professional Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-studio-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon size={24} className="text-studio-accent" />
                </div>
                <h3 className="font-semibold text-studio-text mb-2">{feature.title}</h3>
                <p className="text-sm text-studio-textSecondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Get Started */}
        <div className="text-center">
          <button
            onClick={() => onGetStarted()}
            className="studio-btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
          >
            <Wand2 size={20} />
            Get Started
          </button>
          <p className="text-studio-textSecondary mt-4 text-sm">
            Press <kbd className="bg-studio-surface px-2 py-1 rounded text-xs">Ctrl+G</kbd> to generate images
          </p>
        </div>
      </div>
    </div>
  )
}

export default Welcome