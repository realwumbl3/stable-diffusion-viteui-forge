// Live preview overlay for the inpaint canvas
import styled, { keyframes } from 'styled-components';

type Bounds = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const maskedPreviewSwipeAnimation = keyframes`
    from {
        background-position: -200% 0;
    }
    to {
        background-position: 200% 0;
    }
`;

const MaskedLivePreviewContainer = styled.div<{ $maskSrc: string }>`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    place-items: center;
    justify-content: center;
    overflow: hidden;
    mask-image: url(${(props) => props.$maskSrc});
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: cover;
    -webkit-mask-image: url(${(props) => props.$maskSrc});
    -webkit-mask-position: center;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: cover;
`;

const MaskedLivePreviewGradient = styled.div`
    position: absolute;
    inset: 0;
    background-image: linear-gradient(125deg, transparent 15%, #ffffff 17%, transparent 45%);
    background-size: 200% 100%;
    animation: ${maskedPreviewSwipeAnimation} 3s linear infinite;
    mix-blend-mode: overlay;
    opacity: 1;
    z-index: 2;
    pointer-events: none;
    mask: inherit;
    -webkit-mask: inherit;
`;

interface LivePreviewProps {
    focusBounds: Bounds | null;
    maskBounds: Bounds | null;
    maskBorderMode: boolean;
    livePreview: string | null;
    previewMaskSnapshot: string | null;
    generationMode: string;
    isInpaintGenerating: boolean;
}

const LivePreview = ({
    focusBounds,
    maskBounds,
    maskBorderMode,
    livePreview,
    previewMaskSnapshot,
    generationMode,
    isInpaintGenerating,
}: LivePreviewProps) => {
    // Create preview overlay
    let previewOverlay: React.ReactNode = null;
    if (livePreview) {
        const livePreviewElement = (
            <img
                src={livePreview}
                alt="Live preview"
                className="w-full h-full object-contain shadow-studio-border rounded-lg overflow-hidden"
                draggable={false}
            />
        );

        if (previewMaskSnapshot && generationMode === "inpaint") {
            previewOverlay = (
                <MaskedLivePreviewContainer $maskSrc={previewMaskSnapshot}>
                    {livePreviewElement}
                    {isInpaintGenerating && <MaskedLivePreviewGradient />}
                </MaskedLivePreviewContainer>
            );
        } else {
            previewOverlay = (
                <div
                    className="absolute pointer-events-none w-full h-full inset-0 flex place-items-center"
                >
                    {livePreviewElement}
                </div>
            );
        }
    }

    // Handle full canvas preview when no focus bounds
    if (!focusBounds) {
        return previewOverlay ? (
            <div className="absolute inset-0 pointer-events-none">
                {previewOverlay}
            </div>
        ) : null;
    }

    const outerBorderStyle = {
        top: `${focusBounds.y}px`,
        left: `${focusBounds.x}px`,
        width: `${focusBounds.width}px`,
        height: `${focusBounds.height}px`
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {maskBorderMode ? (
                <div style={{ opacity: 0.9 }}>
                    <FocusBoundsOverlay
                        focusBounds={focusBounds}
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

const commonBlindStyle = {
    position: 'absolute' as const,
    backgroundColor: 'var(--studio-bg)' as const,
}

const FocusBoundsOverlay = ({
    focusBounds,
}: {
    focusBounds: Bounds;
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

export default LivePreview;