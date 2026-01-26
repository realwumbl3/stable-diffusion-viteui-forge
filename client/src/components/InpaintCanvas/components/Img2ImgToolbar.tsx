import NumberSelector from "../../NumberSelector";

interface Img2ImgToolbarProps {
    denoisingStrength: number;
    setDenoisingStrength: (value: number) => void;
}

const Img2ImgToolbar = ({
    denoisingStrength,
    setDenoisingStrength,
}: Img2ImgToolbarProps) => {
    const handleDenoisingStrengthChange = (value: number) => {
        // Round to one decimal place to avoid floating point precision issues
        const roundedValue = Math.round(value * 100) / 100;
        setDenoisingStrength(roundedValue);
    };

    return (
        <div className="p-1 w-24 rounded-lg border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
            <div className="text-xs font-semibold text-studio-text mb-1 text-center">Img2Img Tools</div>
            <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-1">
                    <NumberSelector
                        value={denoisingStrength}
                        onChange={handleDenoisingStrengthChange}
                        min={0}
                        max={1}
                        step={0.01}
                        label="Denoise"
                    />
                </div>
            </div>
        </div>
    );
};

export default Img2ImgToolbar;