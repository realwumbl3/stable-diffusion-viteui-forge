// VITE UI
import { useRef, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import type { InpaintParametersPanelProps } from "../../../types/components";

const InpaintParametersPanel = ({
    // Mask blur parameters
    maskBlur,
    setMaskBlur,
    // Masked content parameters
    inpaintingFill,
    setInpaintingFill,
    // Denoise strength parameters
    denoisingStrength,
    setDenoisingStrength,
    // Inpaint at full res parameters
    inpaintFullRes,
    setInpaintFullRes,
    // Invert mask parameters
    inpaintingMaskInvert,
    setInpaintingMaskInvert,
    // Full res padding parameters
    inpaintFullResPadding,
    setInpaintFullResPadding,
}: InpaintParametersPanelProps) => {
    const paddingControlRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = paddingControlRef.current;
        if (!element) return;

        const handleWheel = (e: WheelEvent) => {
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

    return (
        <div className="p-2 w-56 rounded-2xl border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-2">
                    <div className="text-xs font-semibold text-studio-text border-b border-studio-border pb-1">
                        Inpaint Parameters
                    </div>

                    {/* Mask Blur */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-studio-text font-medium">Mask Blur</label>
                        <input
                            type="range"
                            min="0"
                            max="64"
                            step="1"
                            value={maskBlur}
                            onChange={(e) => setMaskBlur(parseInt(e.target.value))}
                            className="studio-slider w-full h-1"
                        />
                        <div className="flex justify-between text-xs text-studio-textSecondary">
                            <span>0</span>
                            <span className="font-medium">{maskBlur}px</span>
                            <span>64</span>
                        </div>
                    </div>

                    {/* Mode */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-studio-text font-medium whitespace-nowrap">Mode:</label>
                        <select
                            value={inpaintingFill}
                            onChange={(e) => setInpaintingFill(parseInt(e.target.value))}
                            className="studio-select flex-1 text-xs"
                        >
                            <option value={0}>Fill</option>
                            <option value={1}>Original</option>
                            <option value={2}>Latent Noise</option>
                            <option value={3}>Latent Nothing</option>
                        </select>
                    </div>

                    {/* Denoise Strength */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-studio-text font-medium">Denoise Strength</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={denoisingStrength}
                            onChange={(e) => setDenoisingStrength(parseFloat(e.target.value))}
                            className="studio-slider w-full h-1"
                        />
                        <div className="flex justify-between text-xs text-studio-textSecondary">
                            <span>0.0</span>
                            <span className="font-medium">{denoisingStrength.toFixed(2)}</span>
                            <span>1.0</span>
                        </div>
                    </div>

                    {/* Focused and Invert Mask Toggles */}
                    <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => setInpaintFullRes(!inpaintFullRes)}
                                className={`flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                                    inpaintFullRes
                                        ? "bg-studio-accent text-studio-bg shadow-sm"
                                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface border border-studio-border"
                                }`}
                                title="Focused (Full Resolution)"
                                type="button"
                            >
                                Focused
                            </button>
                            <button
                                onClick={() => setInpaintingMaskInvert(!inpaintingMaskInvert)}
                                className={`flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                                    inpaintingMaskInvert
                                        ? "bg-studio-accent text-studio-bg shadow-sm"
                                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface border border-studio-border"
                                }`}
                                title="Invert Mask"
                                type="button"
                            >
                                Invert
                            </button>
                        </div>
                    </div>

                    {/* Full Resolution Padding */}
                    {inpaintFullRes && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-studio-text font-medium">Padding</label>
                            <div
                                ref={paddingControlRef}
                                className="flex items-center gap-1 cursor-pointer"
                                title="Scroll to adjust padding (64px increments)"
                            >
                                <button
                                    onClick={() => setInpaintFullResPadding(Math.max(0, inpaintFullResPadding - 8))}
                                    className="studio-btn-ghost p-1"
                                    title="Decrease Padding"
                                    type="button"
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
                                    type="button"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default InpaintParametersPanel;
