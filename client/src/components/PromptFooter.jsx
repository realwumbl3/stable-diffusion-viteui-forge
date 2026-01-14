import { useState } from 'react'
import { Type, Edit, Wrench } from 'lucide-react'
import PromptComposer from './PromptComposer'
import { useComposerStore } from '../stores/composerStore.tsx'

// Add styles for the composer in the footer
const composerStyles = `
  .composer-container .prompt-composer {
    max-height: 400px;
    overflow-y: auto;
  }

  .composer-container .better-prompt-container {
    background: transparent;
    border: none;
  }

  .composer-container .better-prompt {
    background: var(--studio-surface);
    border: 1px solid var(--studio-border);
    border-radius: 6px;
    box-shadow: none;
  }

  .composer-container .composer-positive .better-prompt {
    border-left: 4px solid #00ff88;
  }

  .composer-container .composer-negative .better-prompt {
    border-left: 4px solid #ff4444;
  }

  .composer-container .header {
    background: var(--studio-panel);
    border-bottom: 1px solid var(--studio-border);
  }

  .composer-container .better-prompt-title {
    color: var(--studio-text);
  }

  .composer-container .button {
    background: var(--studio-surface);
    color: var(--studio-text-secondary);
    border: 1px solid var(--studio-border);
  }

  .composer-container .button:hover {
    background: var(--studio-panel-hover);
    color: var(--studio-text);
  }

  .composer-container .main-editor {
    background: var(--studio-bg);
    border-color: var(--studio-border);
  }

  .composer-container .node {
    background: var(--studio-panel);
    border-color: var(--studio-border);
  }

  .composer-container .node:hover {
    border-color: var(--studio-accent);
  }

  .composer-container textarea,
  .composer-container input {
    background: var(--studio-bg);
    color: var(--studio-text);
    border-color: var(--studio-border);
  }

  .composer-container textarea:focus,
  .composer-container input:focus {
    border-color: var(--studio-accent);
    outline: none;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = composerStyles;
  document.head.appendChild(style);
}

const PromptFooter = ({
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  collapsed = false,
  onToggle
}) => {
  const [mode, setMode] = useState('simple') // 'simple' or 'composer'
  const [composerTarget, setComposerTarget] = useState('positive') // 'positive' or 'negative'

  // Use composer store
  const {
    getCurrentTargetData,
    updateCurrentTargetData
  } = useComposerStore()
  return (
    <footer className="studio-panel border-t border-studio-border">
      <div className="p-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Type size={16} className="text-studio-textSecondary" />
            <h3 className="text-studio-text font-medium text-sm">Prompt Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            {!collapsed && (
              <>
                <button
                  onClick={() => setMode('simple')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    mode === 'simple'
                      ? 'bg-studio-accent text-white'
                      : 'text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface'
                  }`}
                  title="Simple text input mode"
                >
                  <Edit size={12} />
                  Simple
                </button>
                <button
                  onClick={() => setMode('composer')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    mode === 'composer'
                      ? 'bg-studio-accent text-white'
                      : 'text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface'
                  }`}
                  title="Advanced composer mode"
                >
                  <Wrench size={12} />
                  Composer
                </button>
              </>
            )}
            <button
              onClick={onToggle}
              className="text-studio-textSecondary hover:text-studio-text transition-colors"
            >
              {collapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>

        {/* Prompt inputs */}
        {!collapsed && (
          <div className="space-y-3">
            {mode === 'simple' ? (
              <>
                <div>
                  <label className="studio-label text-xs mb-1 block">Positive Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate... (e.g., 'a beautiful landscape, sunset, mountains')"
                    className="studio-textarea w-full resize-none text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="studio-label text-xs mb-1 block">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Describe what you don't want... (e.g., 'blurry, low quality, distorted')"
                    className="studio-textarea w-full resize-none text-sm"
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="composer-container">
                <div className="flex items-center gap-2 mb-3">
                  <label className="studio-label text-xs">Target:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setComposerTarget('positive')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        composerTarget === 'positive'
                          ? 'bg-green-600 text-white'
                          : 'bg-studio-surface text-studio-text-secondary hover:text-studio-text'
                      }`}
                    >
                      Positive
                    </button>
                    <button
                      onClick={() => setComposerTarget('negative')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        composerTarget === 'negative'
                          ? 'bg-red-600 text-white'
                          : 'bg-studio-surface text-studio-text-secondary hover:text-studio-text'
                      }`}
                    >
                      Negative
                    </button>
                  </div>
                </div>
                <PromptComposer
                  onPromptChange={composerTarget === 'positive' ? setPrompt : undefined}
                  onNegativePromptChange={composerTarget === 'negative' ? setNegativePrompt : undefined}
                  initialData={getCurrentTargetData(composerTarget)}
                  onNodesChange={(nodes) => updateCurrentTargetData(composerTarget, nodes)}
                  className={composerTarget === 'positive' ? 'composer-positive' : 'composer-negative'}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  )
}

export default PromptFooter