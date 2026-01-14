import { useState } from "react";
import { Type, Edit, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import PromptComposer from "./PromptComposer";
import { useComposerStore } from "../stores/composerStore";

// Add styles for the composer in the footer
const composerStyles = `

  .composer-container .better-prompt-container {
    background: transparent;
    border: none;
  }

  .composer-container .better-prompt {
    background: var(--studio-surface);
    border-radius: 6px;
    box-shadow: none;
  }

  .composer-container .header {
    background: var(--studio-panel);
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
  }

  .composer-container .node {
    background: var(--studio-panel);
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
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = composerStyles;
    document.head.appendChild(style);
}

const PromptFooter = ({ prompt, setPrompt, negativePrompt, setNegativePrompt, collapsed = false, onToggle }) => {
    const [mode, setMode] = useState("simple"); // 'simple' or 'composer'

    // Use composer store
    const { getCurrentProjectData, updateCurrentProjectData } = useComposerStore();
    return (
        <footer className="studio-panel border-t border-studio-border">
            <div className="p-2">
                {/* Header with toggle */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Type size={16} className="text-studio-textSecondary" />
                        <h3 className="text-studio-text font-medium text-sm">Prompt Editor</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {!collapsed && (
                            <>
                                <button
                                    onClick={() => setMode("simple")}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                        mode === "simple"
                                            ? "bg-studio-accent text-white"
                                            : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                    }`}
                                    title="Simple text input mode"
                                >
                                    <Edit size={12} />
                                    Simple
                                </button>
                                <button
                                    onClick={() => setMode("composer")}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                        mode === "composer"
                                            ? "bg-studio-accent text-white"
                                            : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
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
                            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </button>
                    </div>
                </div>

                {/* Prompt inputs */}
                {!collapsed && (
                    <div className="space-y-3">
                        {mode === "simple" ? (
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
                                <PromptComposer
                                    onPromptChange={setPrompt}
                                    onNegativePromptChange={setNegativePrompt}
                                    initialData={getCurrentProjectData().positive.concat(getCurrentProjectData().negative)}
                                    onNodesChange={(nodes) => {
                                        // For now, store all nodes in positive - this can be refined later
                                        updateCurrentProjectData('positive', nodes)
                                        updateCurrentProjectData('negative', [])
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </footer>
    );
};

export default PromptFooter;
