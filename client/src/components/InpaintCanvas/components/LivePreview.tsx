// Live preview overlay for the inpaint canvas
import styled, { keyframes } from 'styled-components';
import type { Bounds } from '../../../types/components';

interface LivePreviewProps {
    focusBounds: Bounds | null;
    maskBounds: Bounds | null;
    maskBorderMode: boolean;
    showBorder: boolean;
    livePreview: string | null;
    previewMaskSnapshot: string | null;
}

const LivePreview = ({
    focusBounds,
    maskBounds,
    maskBorderMode,
    showBorder,
    livePreview,
    previewMaskSnapshot,
}: LivePreviewProps) => {
    // Create preview overlay
    let previewOverlay: React.ReactNode = null;
    let livePreviewElement = <img
        src={livePreview ?? undefined}
        alt="Live preview"
        className="w-full h-full object-cover shadow-studio-border rounded-lg overflow-hidden"
        draggable={false}
        style={{
            visibility: livePreview ? 'visible' : 'hidden',
        }}
    />

    if (previewMaskSnapshot) {
        previewOverlay = (
            <MaskedLivePreviewContainer $maskSrc={previewMaskSnapshot}>
                {livePreviewElement}
                <MaskedLivePreviewGradient />
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


    // Handle full canvas preview when no focus bounds
    if (!focusBounds) {
        return previewOverlay;
    }

    const outerBorderStyle = {
        top: `${focusBounds.y}px`,
        left: `${focusBounds.x}px`,
        width: `${focusBounds.width}px`,
        height: `${focusBounds.height}px`
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {maskBorderMode && <FocusBoundsOverlay focusBounds={focusBounds} />}

            {showBorder && <div className="absolute inset-0 pointer-events-none rounded-md outline outline-[2px] outline-offset-[2px] outline-white mix-blend-difference"
                style={outerBorderStyle}
            ></div>}
            <div className="absolute inset-0 pointer-events-none rounded-md"
                style={outerBorderStyle}
            >{previewOverlay}</div>

            {
                showBorder && maskBounds && (
                    <div
                        className="absolute outline-dashed outline-white mix-blend-difference rounded-sm"
                        style={{
                            top: `${maskBounds.y}px`,
                            left: `${maskBounds.x}px`,
                            width: `${maskBounds.width}px`,
                            height: `${maskBounds.height}px`,
                            outlineWidth: '2px',
                            outlineOffset: '2px',
                            opacity: 0.4,
                        }}
                    />
                )
            }
        </div >
    );
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
    background-repeat: no-repeat;
    animation: ${maskedPreviewSwipeAnimation} 3s linear forwards;
    animation-iteration-count: 3;
    mix-blend-mode: overlay;
    opacity: 1;
    z-index: 2;
    pointer-events: none;
    mask: inherit;
    -webkit-mask: inherit;
`;

const Blinder = styled.div`
    position: absolute;
    background-color: var(--studio-bg);
`;

const FocusBoundsOverlay = ({
    focusBounds,
}: {
    focusBounds: Bounds;
}) => (
    <div style={{ opacity: 0.9 }}>
        {focusBounds.y > 0 && (
            <Blinder
                style={{
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${Math.max(0, focusBounds.y)}px`,
                }}
            />
        )}
        <Blinder
            style={{
                top: `${focusBounds.y + focusBounds.height}px`,
                left: 0,
                width: '100%',
                height: '10000px',
            }}
        />
        {focusBounds.x > 0 && (
            <Blinder
                style={{
                    top: 0,
                    left: 0,
                    width: `${Math.max(0, focusBounds.x)}px`,
                    height: '100%',
                }}
            />
        )}
        <Blinder
            style={{
                top: 0,
                left: `${focusBounds.x + focusBounds.width}px`,
                width: '10000px',
                height: '100%',
            }}
        />
    </div>
);

export default LivePreview;