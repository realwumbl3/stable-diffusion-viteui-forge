import { X, Maximize2 } from "lucide-react";
import { cn, resolveImageSrc, parseWorkspaceImage } from "../lib/utils";
import { useState, useRef, useEffect } from "react";
import api from "../api";

const TimelineItem = ({
    item,
    isActive,
    onSelect,
    onDiscard,
    showDiscard = false,
    badge = null,
    onCommit,
    onReject,
    showCommitReject = false,
    onUpscale,
    showUpscale = false,
    commitLabel = "Commit",
    getGenerationImageUrl,
}) => {
    const [aspectRatio, setAspectRatio] = useState(1);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const fetchDimensions = async () => {
            if (item.genid && item.workspace) {
                try {
                    console.log("Fetching generation metadata", { genid: item.genid, workspace: item.workspace });
                    const category = item.status === 'commit' ? 'commits' : item.status === 'reject' ? 'rejects' : 'candidates';
                    const meta = await api.getGenerationAsset(item.workspace, category, item.genid, 'meta.json');
                    const width = meta.full_width;
                    const height = meta.full_height;
                    setAspectRatio(width > 0 && height > 0 ? width / height : 1);
                    setImageDimensions({ width, height });
                } catch (error) {
                    console.warn("Failed to fetch generation metadata", error);
                }
            }
        };

        fetchDimensions();
    }, [item.genid, item.workspace, item.status]);

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
                    src={getGenerationImageUrl ? getGenerationImageUrl(item, 'preview') : resolveImageSrc(item.image, "preview")}
                    crossOrigin="anonymous"
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
                        {showDiscard && !showDeleteConfirm && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setShowDeleteConfirm(true);
                                }}
                                className="rounded bg-studio-panel/80 text-studio-textSecondary p-1 hover:bg-studio-surface transition-colors"
                                title="Delete"
                                type="button"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {showDeleteConfirm && (
                            <div className="flex gap-1">
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDiscard?.();
                                        setShowDeleteConfirm(false);
                                    }}
                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                                    title="Confirm Delete"
                                    type="button"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowDeleteConfirm(false);
                                    }}
                                    className="px-2 py-1 bg-studio-panel text-studio-textSecondary text-xs rounded hover:bg-studio-surface transition-colors"
                                    title="Cancel"
                                    type="button"
                                >
                                    Cancel
                                </button>
                            </div>
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
                            {commitLabel}
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
