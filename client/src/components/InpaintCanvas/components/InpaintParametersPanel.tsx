import { Eye, EyeOff, Square } from "lucide-react";
import OptionPicker from "../../OptionPicker";
import NumberSelector from "../../NumberSelector";
import KeyIndicator from "../../KeyIndicator";

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
    // Mask border mode parameters
    maskBorderMode,
    setMaskBorderMode,
    // Mask and border visibility parameters
    showMask,
    setShowMask,
    showBorder,
    setShowBorder,
    returnPartialCandidates,
    setReturnPartialCandidates,
}: {
    maskBlur: number
    setMaskBlur: (value: number) => void
    inpaintingFill: number
    setInpaintingFill: (value: number) => void
    denoisingStrength: number
    setDenoisingStrength: (value: number) => void
    inpaintFullRes: boolean
    setInpaintFullRes: (value: boolean) => void
    inpaintingMaskInvert: boolean
    setInpaintingMaskInvert: (value: boolean) => void
    inpaintFullResPadding: number
    setInpaintFullResPadding: (value: number) => void
    maskBorderMode: boolean
    setMaskBorderMode: (value: boolean) => void
    showMask: boolean
    setShowMask: (value: boolean) => void
    showBorder: boolean
    setShowBorder: (value: boolean) => void
    returnPartialCandidates: boolean
    setReturnPartialCandidates: (value: boolean) => void
}) => {
    const fillOptions = [
        { value: "0", label: "Fill" },
        { value: "1", label: "Source" },
        { value: "2", label: "LNoise" },
        { value: "3", label: "LEmpty" },
    ];

    const handleDenoisingStrengthChange = (value: number) => {
        const roundedValue = Math.round(value * 100) / 100;
        setDenoisingStrength(roundedValue);
    };

    return (
        <div className="p-1 w-42 rounded-lg border border-studio-border bg-studio-bg/30 shadow-2xl backdrop-blur flex flex-col gap-1">
            {/* Mask and Border Visibility Toggles */}
            <div className="flex flex-row gap-1">
                <button
                    onClick={() => setShowMask(!showMask)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1 relative ${showMask
                        ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        }`}
                    title="Toggle Mask Visibility (M)"
                    type="button"
                >
                    {showMask ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span className="text-center leading-tight">Mask</span>
                    <KeyIndicator keys="M" />
                </button>

                {inpaintFullRes && <button
                    onClick={() => setShowBorder(!showBorder)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1 relative ${showBorder
                        ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        }`}
                    title="Toggle Border Visualization (N)"
                    type="button"
                >
                    <Square size={14} />
                    <span className="text-center leading-tight">Border</span>
                    <KeyIndicator keys="N" />
                </button>
                }

            </div>
            <div className="grid grid-cols-2 gap-1 items-center">

                <div className="flex justify-center">
                    <OptionPicker
                        options={fillOptions}
                        value={String(inpaintingFill)}
                        onChange={(value) => setInpaintingFill(parseInt(value, 10))}
                        title="Mode"
                        openingDirection="up"
                    />
                </div>

                <div className="flex justify-center">
                    <NumberSelector
                        value={denoisingStrength}
                        onChange={handleDenoisingStrengthChange}
                        min={0}
                        max={1}
                        step={0.01}
                        label="denoise"
                        suffix="x"
                    />
                </div>

                <div className="flex justify-center">
                    <NumberSelector
                        value={maskBlur}
                        onChange={setMaskBlur}
                        min={0}
                        max={64}
                        step={1}
                        label="blur"
                        suffix="px"
                    />
                </div>

                <button
                    onClick={() => setInpaintingMaskInvert(!inpaintingMaskInvert)}
                    className={`flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${inpaintingMaskInvert
                        ? "bg-studio-accent text-studio-bg shadow-sm"
                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        }`}
                    title="Invert Mask"
                    type="button"
                >
                    invert
                </button>

                <button
                    onClick={() => setInpaintFullRes(!inpaintFullRes)}
                    className={`flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${inpaintFullRes
                        ? "bg-studio-accent text-studio-bg shadow-sm"
                        : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        }`}
                    title="Focused (Full Resolution)"
                    type="button"
                >
                    focused
                </button>
                {inpaintFullRes &&
                    <div className="flex justify-center">
                        <NumberSelector
                            value={inpaintFullResPadding}
                            onChange={setInpaintFullResPadding}
                            min={0}
                            max={4096}
                            step={8}
                            label="pad"
                            suffix="px"
                        />
                    </div>
                }
                {inpaintFullRes && (
                    <>
                        <button
                            onClick={() => setMaskBorderMode(!maskBorderMode)}
                            className={`flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${maskBorderMode
                                ? "bg-studio-accent text-studio-bg shadow-sm"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                }`}
                            title="Mask Border Mode"
                            type="button"
                        >
                            blinds
                        </button>

                        <button
                            onClick={() => setReturnPartialCandidates(!returnPartialCandidates)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-all duration-200 flex-1 relative ${returnPartialCandidates
                                ? "bg-studio-accent/20 text-studio-accent border border-studio-accent/30"
                                : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                                }`}
                            title="Toggle Partial Candidates"
                            type="button"
                        >
                            <span className="text-center leading-tight">Partial</span>
                        </button>
                    </>
                )}
            </div>
        </div >
    );
};

export default InpaintParametersPanel;
