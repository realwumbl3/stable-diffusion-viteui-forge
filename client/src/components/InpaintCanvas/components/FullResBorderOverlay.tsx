// Full resolution border overlays for the inpaint canvas
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
    previewOverlay: React.ReactNode;
}

const FocusBoundsOverlay = ({
    focusBounds,
    commonBlindStyle
}: {
    focusBounds: Bounds;
    commonBlindStyle: React.CSSProperties;
}) => (
    <>
        {focusBounds.y > 0 && (
            <div
                style={{
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${Math.max(0, focusBounds.y)}px`,
                    ...commonBlindStyle,
                }}
            />
        )}
        <div
            style={{
                top: `${focusBounds.y + focusBounds.height}px`,
                left: 0,
                width: '100%',
                height: '10000px',
                ...commonBlindStyle,
            }}
        />
        {focusBounds.x > 0 && (
            <div
                style={{
                    top: 0,
                    left: 0,
                    width: `${Math.max(0, focusBounds.x)}px`,
                    height: '100%',
                    ...commonBlindStyle,
                }}
            />
        )}
        <div
            style={{
                top: 0,
                left: `${focusBounds.x + focusBounds.width}px`,
                width: '10000px',
                height: '100%',
                ...commonBlindStyle,
            }}
        />
    </>
);

const FullResBorderOverlay = ({
    focusBounds,
    maskBounds,
    maskBorderMode,
    previewOverlay,
}: FullResBorderOverlayProps) => {
    if (!focusBounds) {
        return null;
    }

    const commonBlindStyle = {
        position: 'absolute' as const,
        backgroundColor: 'var(--studio-bg)' as const,
    };

    const outerBorderStyle = {
        top: `${focusBounds.y}px`,
        left: `${focusBounds.x}px`,
        width: `${focusBounds.width}px`,
        height: `${focusBounds.height}px`
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {maskBorderMode ? (
                <div style={{ opacity: 0.9 }}>
                    <FocusBoundsOverlay
                        focusBounds={focusBounds}
                        commonBlindStyle={commonBlindStyle}
                    />
                </div>
            ) : <>
                <div className="absolute inset-0 pointer-events-none rounded-md outline outline-[2px] outline-offset-[2px] outline-white mix-blend-difference"
                    style={outerBorderStyle}
                ></div>
                <div className="absolute inset-0 pointer-events-none rounded-md"
                    style={outerBorderStyle}
                >{previewOverlay}</div>
            </>
            }

            {
                maskBounds && (
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
                )
            }
        </div >
    );
};

export default FullResBorderOverlay;
