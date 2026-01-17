import { useState, useRef, useEffect } from "react";
import { Brush, Eraser, PaintBucket, RotateCcw, Undo, Redo, Eye, EyeOff, Minus, Plus, Square } from "lucide-react";
import { cn } from "../lib/utils";

const InpaintToolbar = ({
    drawingMode,
    setDrawingMode,
    showMask,
    setShowMask,
    showBorder,
    setShowBorder,
    inpaintFullRes,
    inpaintFullResPadding,
    setInpaintFullResPadding,
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
}) => {
    const paddingControlRef = useRef(null);

    useEffect(() => {
        const element = paddingControlRef.current;
        if (!element) return;

        const handleWheel = (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                setInpaintFullResPadding(Math.max(0, inpaintFullResPadding - 64));
            } else {
                setInpaintFullResPadding(Math.min(1024, inpaintFullResPadding + 64));
            }
        };

        element.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            element.removeEventListener("wheel", handleWheel);
        };
    }, [inpaintFullResPadding, setInpaintFullResPadding]);
    const tools = [
        {
            id: "brush",
            icon: Brush,
            label: "Brush",
            shortcut: "B",
        },
        {
            id: "erase",
            icon: Eraser,
            label: "Eraser",
            shortcut: "E",
        },
        {
            id: "fill",
            icon: PaintBucket,
            label: "Fill",
            shortcut: "F",
        },
        {
            id: "clear",
            icon: RotateCcw,
            label: "Clear All",
            shortcut: "C",
        },
    ];

    return (
        <div className="studio-panel p-2 w-48">
            <div className="flex flex-col gap-2">
                {/* Drawing Tools */}
                <div className="flex flex-col gap-1">
                    <div className="grid grid-cols-2 gap-1 bg-studio-surface rounded-lg p-1 border border-studio-border">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    if (tool.id === "clear") {
                                        onClear();
                                    } else {
                                        setDrawingMode(tool.id);
                                    }
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200",
                                    drawingMode === tool.id
                                        ? "bg-studio-accent text-studio-bg shadow-sm"
                                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                )}
                                title={`${tool.label} (${tool.shortcut})`}
                            >
                                <tool.icon size={14} />
                                <span className="text-center leading-tight">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fill Tool Settings */}
                {drawingMode === "fill" && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <div className="grid grid-cols-3 gap-1 bg-studio-surface rounded-lg p-1 border border-studio-border">
                                {["canvas", "image", "both"].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setFillTarget(mode)}
                                        className={cn(
                                            "flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
                                            fillTarget === mode
                                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                        )}
                                        title={`Fill target: ${mode}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-studio-textSecondary text-center">Fill Target</span>
                        </div>
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
                                <span className="text-xs text-studio-textSecondary">Fill Tolerance</span>
                                <span className="text-xs text-studio-textSecondary">{fillTolerance}</span>
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
                                <span className="text-xs text-studio-textSecondary">Fill Overfill</span>
                                <span className="text-xs text-studio-textSecondary">{fillOverfill}px</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mask and Border Visibility Toggles */}
                <div className="flex flex-row gap-1">
                    <button
                        onClick={() => setShowMask(!showMask)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1",
                            showMask
                                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        )}
                        title="Toggle Mask Visibility"
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
                    >
                        <Square size={14} />
                        <span className="text-center leading-tight">Border</span>
                    </button>
                </div>

                {/* Padding Control */}
                {inpaintFullRes && (
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                ref={paddingControlRef}
                                className="flex items-center gap-1 cursor-pointer"
                                title="Scroll to adjust padding (64px increments)"
                            >
                                <button
                                    onClick={() => setInpaintFullResPadding(Math.max(0, inpaintFullResPadding - 8))}
                                    className="studio-btn-ghost p-1"
                                    title="Decrease Padding"
                                >
                                    <Minus size={12} />
                                </button>
                                <div className="flex items-center px-2 py-1 bg-studio-surface rounded border border-studio-border min-w-[45px] justify-center">
                                    <span className="text-xs font-medium text-studio-text">
                                        {inpaintFullResPadding}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setInpaintFullResPadding(Math.min(1024, inpaintFullResPadding + 8))}
                                    className="studio-btn-ghost p-1"
                                    title="Increase Padding"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                            <span className="text-xs text-studio-textSecondary text-center">Padding</span>
                        </div>
                    </div>
                )}

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
