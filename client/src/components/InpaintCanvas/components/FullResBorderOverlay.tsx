// VITE UI: Full resolution border overlays for the inpaint canvas
type Bounds = {
    x: number;
    y: number;
    width: number;
    height: number;
};

interface FullResBorderOverlayProps {
    focusBounds: Bounds | null;
    maskBounds: Bounds | null;
    maskBorderMode: boolean;
}

const FullResBorderOverlay = ({
    focusBounds,
    maskBounds,
    maskBorderMode,
}: FullResBorderOverlayProps) => {
    if (!focusBounds) {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {maskBorderMode ? (
                <>
                    {focusBounds.y > 0 && (
                        <div
                            className="absolute bg-black/70"
                            style={{
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${Math.max(0, focusBounds.y)}px`,
                            }}
                        />
                    )}
                    <div
                        className="absolute bg-black/70"
                        style={{
                            top: `${focusBounds.y + focusBounds.height}px`,
                            left: 0,
                            width: '100%',
                            height: '10000px',
                        }}
                    />
                    {focusBounds.x > 0 && (
                        <div
                            className="absolute bg-black/70"
                            style={{
                                top: 0,
                                left: 0,
                                width: `${Math.max(0, focusBounds.x)}px`,
                                height: '100%',
                            }}
                        />
                    )}
                    <div
                        className="absolute bg-black/70"
                        style={{
                            top: 0,
                            left: `${focusBounds.x + focusBounds.width}px`,
                            width: '10000px',
                            height: '100%',
                        }}
                    />
                </>
            ) : (

                <div
                    className="absolute outline outline-white mix-blend-difference rounded-md"
                    style={{
                        top: `${focusBounds.y}px`,
                        left: `${focusBounds.x}px`,
                        width: `${focusBounds.width}px`,
                        height: `${focusBounds.height}px`,
                        outlineWidth: '2px',
                        outlineOffset: '2px',
                    }}
                />


            )}
            {maskBounds && (
                <div
                    className="absolute outline-dashed outline-white mix-blend-difference rounded-md"
                    style={{
                        top: `${maskBounds.y}px`,
                        left: `${maskBounds.x}px`,
                        width: `${maskBounds.width}px`,
                        height: `${maskBounds.height}px`,
                        outlineWidth: '2px',
                        outlineOffset: '2px',
                    }}
                />
            )}
        </div>
    );
};

export default FullResBorderOverlay;
