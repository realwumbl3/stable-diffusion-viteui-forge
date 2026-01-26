import { useState } from "react";
import { Sliders } from "lucide-react";
import { cn } from "../lib/utils";
import ResolutionPicker from "./ResolutionPicker";
import NumberSelector from "./NumberSelector";
import type { PropertiesPanelProps } from "../types/components";

const PropertiesPanel = ({
    collapsed,
    onToggle,
    // Generation settings
    generationMode,
    width,
    setWidth,
    height,
    setHeight,
    batchSize,
    setBatchSize,
    denoisingStrength,
    setDenoisingStrength,
    inputImage,
    onImageUpload,
    saveImages,
    setSaveImages,
}: PropertiesPanelProps) => {
    const [activeSection, setActiveSection] = useState<string>("generation");

    const sections = [
        { id: "generation", icon: Sliders, label: "Generation, parameters", description: "All generation settings" },
    ];

    return (
        <aside
            className={cn(
                "studio-properties-panel relative overflow-hidden transition-all duration-300 ease-in-out w-96 flex flex-col",
                collapsed ? "w-12" : "w-80"
            )}
        >
            {/* Always-full-width Content Container */}
            <div className="w-80 h-full">
                {/* Collapsed Icon List */}
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col items-center gap-4 py-6 px-2 transition-opacity duration-300 ease-in-out",
                        collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => {
                                setActiveSection(section.id);
                                onToggle();
                            }}
                            className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110",
                                activeSection === section.id
                                    ? "bg-studio-accent text-black shadow-lg font-semibold"
                                    : "bg-studio-panel text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                            )}
                            title={section.label}
                            type="button"
                        >
                            <section.icon size={20} />
                        </button>
                    ))}
                </div>

                {/* Expanded Content */}
                <div
                    className={cn(
                        "h-full flex flex-col transition-opacity duration-300 ease-in-out",
                        collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                >
                    {/* Properties Header */}
                    <div className="studio-sidebar-header p-4">
                        <h3 className="text-studio-text font-semibold text-sm">Properties</h3>
                    </div>

                    {/* Section Navigation */}
                    <div className="px-4 pb-4 space-y-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => {
                                    if (activeSection === section.id) {
                                        onToggle();
                                    } else {
                                        setActiveSection(section.id);
                                    }
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                    activeSection === section.id
                                        ? "bg-studio-accent/60 border border-studio-accent/30"
                                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                )}
                                type="button"
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
                    <div className="studio-sidebar-content !overflow-y-auto flex-1 overflow-hidden">
                        <div className="p-4 space-y-6">
                            {/* Generation, parameters Section */}
                            {activeSection === "generation" && (
                                <div className="space-y-6">
                                    {generationMode === "img2img" && (
                                        <>
                                            <div>
                                                <label className="studio-label mb-1 block">Input Image</label>
                                                <div className="space-y-2">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (e) => {
                                                                    if (e.target?.result) {
                                                                        onImageUpload(e.target.result as string);
                                                                    }
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="w-full text-sm text-studio-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-studio-accent file:text-white"
                                                    />
                                                    {inputImage && (
                                                        <div className="relative">
                                                            <img
                                                                src={inputImage}
                                                                crossOrigin="anonymous"
                                                                alt="Input"
                                                                className="w-full h-32 object-cover rounded-lg border border-studio-border"
                                                            />
                                                            <button
                                                                onClick={() => onImageUpload(null)}
                                                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                                                type="button"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="studio-label mb-1 block">Denoising Strength</label>
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
                                                    Higher values = more creative changes, lower values = more faithful
                                                    to original
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Batch Size */}
                                    <div>
                                        <label className="studio-label mb-1 block">Batch Size</label>
                                        <NumberSelector
                                            value={batchSize}
                                            onChange={setBatchSize}
                                            min={1}
                                            max={8}
                                            step={1} 
                                        />
                                    </div>

                                    {/* Save to Output Folder */}
                                    <div>
                                        <label className="studio-label mb-1 block">Save Options</label>
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="save-images-toggle"
                                                    checked={saveImages}
                                                    onChange={(e) => setSaveImages(e.target.checked)}
                                                    className="w-4 h-4 text-studio-accent bg-studio-bg border-studio-border rounded focus:ring-studio-accent focus:ring-2"
                                                />
                                                <label
                                                    htmlFor="save-images-toggle"
                                                    className="text-sm text-studio-text cursor-pointer"
                                                >
                                                    Save images to output folder
                                                </label>
                                            </div>
                                        </div>
                                        <p className="text-xs text-studio-text-muted mt-1">
                                            When enabled, generated images will be saved to the server's
                                            output directory
                                        </p>
                                    </div>

                                    {/* Resolution Picker */}
                                    <ResolutionPicker
                                        width={width}
                                        setWidth={setWidth}
                                        height={height}
                                        setHeight={setHeight}
                                        inputImage={inputImage || undefined}
                                    />

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default PropertiesPanel;
