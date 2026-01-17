import { Minus, Plus } from "lucide-react";

const BrushSettings = ({
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    zoom,
}) => {
    return (
        <div className="absolute bottom-4 right-4 z-20">
            <div className="studio-panel p-2">
                <div className="flex flex-col gap-2">
                    {/* Brush Preview */}
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className="flex items-center justify-center w-full aspect-square bg-studio-surface rounded-lg border border-studio-border cursor-pointer"
                            onWheel={(e) => {
                                e.preventDefault();
                                if (e.deltaY > 0) {
                                    setBrushSize(Math.max(4, brushSize - 4));
                                } else {
                                    setBrushSize(brushSize + 4);
                                }
                            }}
                            title="Scroll to change brush size"
                        >
                            <div
                                className="bg-red-500 rounded-full"
                                style={{
                                    width: `${brushSize * zoom}px`,
                                    height: `${brushSize * zoom}px`,
                                    minWidth: "4px",
                                    minHeight: "4px",
                                    opacity: brushHardness,
                                }}
                            />
                        </div>
                        <span className="text-xs text-studio-textSecondary">Preview</span>
                    </div>

                    {/* Brush Size Control */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setBrushSize(Math.max(4, brushSize - 4))}
                                className="studio-btn-ghost p-1"
                                title="Decrease Brush Size ([)"
                            >
                                <Minus size={14} />
                            </button>
                            <div className="flex items-center px-2 py-1 bg-studio-surface rounded border border-studio-border min-w-[50px] justify-center">
                                <span className="text-xs font-medium text-studio-text">
                                    {brushSize}px
                                </span>
                            </div>
                            <button
                                onClick={() => setBrushSize(brushSize + 4)}
                                className="studio-btn-ghost p-1"
                                title="Increase Brush Size (])"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <span className="text-xs text-studio-textSecondary">Size</span>
                    </div>

                    {/* Brush Hardness Control */}
                    <div className="flex flex-col gap-1">
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={brushHardness}
                            onChange={(e) => setBrushHardness(parseFloat(e.target.value))}
                            className="w-full h-2 bg-studio-surface rounded-lg appearance-none cursor-pointer slider"
                            title={`Brush Hardness: ${Math.round(brushHardness * 100)}% (O/P)`}
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-studio-textSecondary">Hardness</span>
                            <span className="text-xs text-studio-textSecondary">
                                {Math.round(brushHardness * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrushSettings;