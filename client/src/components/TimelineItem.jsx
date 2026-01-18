import { X, Maximize2 } from "lucide-react";
import { cn, resolveImageSrc } from "../lib/utils";
import { useState, useRef, useEffect } from "react";

const TimelineItem = ({ item, isActive, onSelect, onDiscard, showDiscard = false, badge = null, onCommit, onReject, showCommitReject = false, onUpscale, showUpscale = false }) => {
    const [aspectRatio, setAspectRatio] = useState(1);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const imgRef = useRef(null);

    useEffect(() => {
        const img = imgRef.current;
        if (img) {
            const handleLoad = () => {
                const width = img.naturalWidth;
                const height = img.naturalHeight;
                setAspectRatio(width / height);
                setImageDimensions({ width, height });
            };
            if (img.complete) {
                handleLoad();
            } else {
                img.addEventListener("load", handleLoad);
                return () => img.removeEventListener("load", handleLoad);
            }
        }
    }, [item.image]);

    return (
        <div
            className={cn(
                "group relative rounded-lg overflow-hidden transition-all duration-200",
                isActive
                    ? "border-studio-accent shadow-studio-accent/50"
                    : "border-transparent hover:border-studio-border"
            )}
            style={{ aspectRatio: aspectRatio }}
        >
            <button onClick={onSelect} className="w-full h-full text-left" type="button">
                <img
                    ref={imgRef}
                    src={resolveImageSrc(item.image, "previews")}
                    alt="Timeline item"
                    className="w-full h-full object-contain"
                />
            </button>

            {/* Header Container */}
            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-studio-panel/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between">
                    {/* Left side - Resolution */}
                    <div className="flex items-center">
                        {imageDimensions.width > 0 && (
                            <div className="rounded bg-studio-panel/80 text-studio-textSecondary px-1.5 py-0.5 text-xs">
                                {imageDimensions.width}×{imageDimensions.height}
                            </div>
                        )}
                    </div>

                    {/* Right side - Buttons/Badges */}
                    <div className="flex items-center gap-1">
                        {showUpscale && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onUpscale?.(item);
                                }}
                                className="rounded bg-studio-panel/80 text-studio-textSecondary p-1 hover:bg-studio-surface transition-colors"
                                title="Upscale"
                                type="button"
                            >
                                <Maximize2 size={12} />
                            </button>
                        )}
                        {showDiscard && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDiscard?.();
                                }}
                                className="rounded bg-studio-panel/80 text-studio-textSecondary p-1 hover:bg-studio-surface transition-colors"
                                title="Discard"
                                type="button"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {badge && (
                            <div className="rounded bg-studio-panel/80 text-studio-textSecondary p-1">
                                {badge}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showCommitReject && isActive && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-studio-panel/90 to-transparent">
                    <div className="flex gap-1">
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                onCommit?.();
                            }}
                            className="flex-1 px-2 py-1 bg-studio-accent text-white text-xs rounded hover:bg-studio-accent/80 transition-colors"
                            type="button"
                        >
                            Commit
                        </button>
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                onReject?.();
                            }}
                            className="flex-1 px-2 py-1 bg-studio-panel text-studio-textSecondary text-xs rounded hover:bg-studio-surface transition-colors"
                            type="button"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimelineItem;
