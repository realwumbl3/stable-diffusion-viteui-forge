// VITE UI
import { Brush, Eraser, PaintBucket, RotateCcw, Undo, Redo, Eye, EyeOff, Square } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { InpaintToolbarProps } from "../../../types/components";

const InpaintToolbar = ({
    drawingMode,
    setDrawingMode,
    showMask,
    setShowMask,
    showBorder,
    setShowBorder,
    fillTarget,
    setFillTarget,
    fillTolerance,
    setFillTolerance,
    fillOverfill,
    setFillOverfill,
    onUndo,
    onRedo,
    onClear,
    canUndo = false,
    canRedo = false,
}: InpaintToolbarProps) => {

    return (
        <div className="p-1 w-24 rounded-lg border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-1">
                {/* Drawing Tools */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setDrawingMode("brush")}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                            drawingMode === "brush"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Brush"
                        type="button"
                    >
                        <Brush size={14} />
                        <span className="text-center leading-tight">Brush</span>
                    </button>
                    <button
                        onClick={() => setDrawingMode("erase")}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                            drawingMode === "erase"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Eraser"
                        type="button"
                    >
                        <Eraser size={14} />
                        <span className="text-center leading-tight">Eraser</span>
                    </button>
                    <button
                        onClick={() => setDrawingMode("fill")}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                            drawingMode === "fill"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Fill"
                        type="button"
                    >
                        <PaintBucket size={14} />
                        <span className="text-center leading-tight">Fill</span>
                        {drawingMode === "fill" && (
                            <>
                                {(["canvas", "image", "both"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setFillTarget(mode)}
                                        className={cn(
                                            "flex items-center justify-center gap-1 px-1 rounded-md text-xs font-medium transition-all duration-200",
                                            fillTarget === mode
                                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                        )}
                                        title={`Fill target: ${mode}`}
                                        type="button"
                                    >
                                        {mode}
                                    </button>
                                ))}
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="128"
                                        step="1"
                                        value={fillTolerance}
                                        onChange={(e) => setFillTolerance(parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-studio-surface rounded-lg appearance-none cursor-pointer slider"
                                        title={`Fill Tolerance: ${fillTolerance}`}
                                    />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-studio-textSecondary">tolerance {fillTolerance}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="32"
                                        step="1"
                                        value={fillOverfill}
                                        onChange={(e) => setFillOverfill(parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-studio-surface rounded-lg appearance-none cursor-pointer slider"
                                        title={`Fill Overfill: ${fillOverfill}px`}
                                    />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-studio-textSecondary">overfill {fillOverfill}px</span>
                                    </div>
                                </div>
                            </>)}
                    </button>
                    <button
                        onClick={onClear}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                            drawingMode === "clear"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Clear All"
                        type="button"
                    >
                        <RotateCcw size={14} />
                        <span className="text-center leading-tight">Clear All</span>
                    </button>
                </div>

                {/* Mask and Border Visibility Toggles */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setShowMask(!showMask)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1",
                            showMask
                                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Toggle Mask Visibility"
                        type="button"
                    >
                        {showMask ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span className="text-center leading-tight">Mask</span>
                    </button>

                    <button
                        onClick={() => setShowBorder(!showBorder)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1",
                            showBorder
                                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Toggle Border Visualization"
                        type="button"
                    >
                        <Square size={14} />
                        <span className="text-center leading-tight">Border</span>
                    </button>
                </div>


                {/* Undo/Redo (Optional) */}
                {(canUndo || canRedo) && (
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            <button
                                onClick={onUndo}
                                disabled={!canUndo}
                                className={cn(
                                    "flex-1 studio-btn-ghost p-1 flex flex-col items-center gap-1",
                                    !canUndo && "opacity-50 cursor-not-allowed"
                                )}
                                title="Undo (Ctrl+Z)"
                                type="button"
                            >
                                <Undo size={12} />
                                <span className="text-xs">Undo</span>
                            </button>
                            <button
                                onClick={onRedo}
                                disabled={!canRedo}
                                className={cn(
                                    "flex-1 studio-btn-ghost p-1 flex flex-col items-center gap-1",
                                    !canRedo && "opacity-50 cursor-not-allowed"
                                )}
                                title="Redo (Ctrl+Y)"
                                type="button"
                            >
                                <Redo size={12} />
                                <span className="text-xs">Redo</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InpaintToolbar;
