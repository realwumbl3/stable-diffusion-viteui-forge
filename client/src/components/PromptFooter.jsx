import { useState } from "react";
import { Type, Edit, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import PromptComposer from "./PromptComposer";

const PromptFooter = ({ prompt, setPrompt, negativePrompt, setNegativePrompt, collapsed = false, onToggle }) => {
    const [mode, setMode] = useState("simple"); // 'simple' or 'composer'
    return (
        <footer className="studio-panel border-t border-studio-border">
            <div className="p-2">
                {/* Header with toggle */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
                        <Type size={16} className="text-studio-textSecondary" />
                        <h3 className="text-studio-text font-medium text-sm">Prompt Editor</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {!collapsed && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMode("simple");
                                    }}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMode("composer");
                                    }}
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
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            className="text-studio-textSecondary hover:text-studio-text transition-colors"
                        >
                            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                                <PromptComposer onPromptChange={setPrompt} onNegativePromptChange={setNegativePrompt} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </footer>
    );
};

export default PromptFooter;
