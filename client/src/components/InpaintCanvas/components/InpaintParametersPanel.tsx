// VITE UI
import OptionPicker from "../../OptionPicker";
import NumberSelector from "../../NumberSelector";
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
    const fillOptions = [
        { value: "0", label: "Fill" },
        { value: "1", label: "Orig" },
        { value: "2", label: "Noise" },
        { value: "3", label: "Nothing" },
    ];

    const handleDenoisingStrengthChange = (value: number) => {
        const roundedValue = Math.round(value * 100) / 100;
        setDenoisingStrength(roundedValue);
    };

    return (
        <div className="p-1 w-42 rounded-lg border border-studio-border bg-studio-bg/30 shadow-2xl backdrop-blur">
            <div className="grid grid-cols-2 gap-1 items-center">
                <div className="flex justify-center">
                    <OptionPicker
                        options={fillOptions}
                        value={String(inpaintingFill)}
                        onChange={(value) => setInpaintingFill(parseInt(value, 10))}
                        title="Mode"
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
                    Invert
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
                    Focused
                </button>


                {inpaintFullRes && (
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
                )}
            </div>
        </div>
    );
};

export default InpaintParametersPanel;
