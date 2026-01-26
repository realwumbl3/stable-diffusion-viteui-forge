import { Brush, Eraser, PaintBucket, RotateCcw, Undo, Redo } from "lucide-react";
import { cn } from "../../../lib/utils";
import KeyIndicator from "../../KeyIndicator";
import type { InpaintToolbarProps } from "../../../types/components";
import type { WheelEvent } from "react";

const clampRange = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const InpaintToolbar = ({
    drawingMode,
    setDrawingMode,
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

    const handleWheelChange = (
        event: WheelEvent<HTMLInputElement>,
        currentValue: number,
        setter: (value: number) => void,
        min: number,
        max: number,
        step: number = 1
    ) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        const nextValue = clampRange(currentValue + direction * step, min, max);
        if (nextValue !== currentValue) {
            setter(nextValue);
        }
    };

    return (
        <div className="p-1 w-24 rounded-lg border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-1">
                {/* Drawing Tools */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setDrawingMode("brush")}
                        className={cn(
                            "relative flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 simple-block-fill",
                            drawingMode === "brush"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Brush (B)"
                        type="button"
                    >
                        <Brush size={14} />
                        <span className="text-center leading-tight">Brush</span>
                        <KeyIndicator keys="B" />
                    </button>
                    <button
                        onClick={() => setDrawingMode("erase")}
                        className={cn(
                            "relative flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 simple-block-fill",
                            drawingMode === "erase"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Eraser (E)"
                        type="button"
                    >
                        <Eraser size={14} />
                        <span className="text-center leading-tight">Eraser</span>
                        <KeyIndicator keys="E" />
                    </button>
                    <button
                        onClick={() => setDrawingMode("fill")}
                        className={cn(
                            "relative flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 simple-block-fill",
                            drawingMode === "fill"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Fill (F)"
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
                                        max="96"
                                        step="1"
                                        value={fillTolerance}
                                        onChange={(e) => setFillTolerance(parseInt(e.target.value, 10))}
                                        onWheel={(event) =>
                                            handleWheelChange(event, fillTolerance, setFillTolerance, 0, 96, 2)
                                        }
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
                                        onWheel={(event) =>
                                            handleWheelChange(event, fillOverfill, setFillOverfill, 0, 32, 1)
                                        }
                                        className="w-full h-2 bg-studio-surface rounded-lg appearance-none cursor-pointer slider"
                                        title={`Fill Overfill: ${fillOverfill}px`}
                                    />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-studio-textSecondary">overfill {fillOverfill}px</span>
                                    </div>
                                </div>
                            </>)}
                        <KeyIndicator keys="F" />
                    </button>
                    <button
                        onClick={onClear}
                        className={cn(
                            "relative flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 simple-block-fill",
                            drawingMode === "clear"
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Clear All (C)"
                        type="button"
                    >
                        <RotateCcw size={14} />
                        <span className="text-center leading-tight">Clear All</span>
                        <KeyIndicator keys="C" />
                    </button>
                </div>

                {/* Undo/Redo (Optional) */}
                {(canUndo || canRedo) && (
                    <div className="flex flex-col">
                        <div className="flex gap-1">
                            <button
                                onClick={onUndo}
                                disabled={!canUndo}
                                className={cn(
                                    "relative flex-1 studio-btn-ghost p-1 pt-3 rounded-md flex flex-col items-center gap-1 simple-block-fill",
                                    !canUndo && "opacity-50 cursor-not-allowed"
                                )}
                                title="Undo (Ctrl+Z)"
                                type="button"
                            >
                                <Undo size={12} />
                                <span className="text-xs">Undo</span>
                                <KeyIndicator keys="Ctrl+Z" />
                            </button>
                            <button
                                onClick={onRedo}
                                disabled={!canRedo}
                                className={cn(
                                    "relative flex-1 studio-btn-ghost p-1 pt-3 rounded-md flex flex-col items-center gap-1 simple-block-fill",
                                    !canRedo && "opacity-50 cursor-not-allowed"
                                )}
                                title="Redo (Ctrl+Shift+Z)"
                                type="button"
                            >
                                <Redo size={12} />
                                <span className="text-xs">Redo</span>
                                <KeyIndicator keys="Ctrl+Y" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InpaintToolbar;
