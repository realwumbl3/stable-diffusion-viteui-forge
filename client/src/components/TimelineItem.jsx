import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useRef, useEffect } from "react";

const TimelineItem = ({ item, isActive, onSelect, onDiscard, showDiscard = false, badge = null, onCommit, onReject, showCommitReject = false }) => {
    const [aspectRatio, setAspectRatio] = useState(1);
    const imgRef = useRef(null);

    useEffect(() => {
        const img = imgRef.current;
        if (img) {
            const handleLoad = () => {
                setAspectRatio(img.naturalWidth / img.naturalHeight);
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
                <img ref={imgRef} src={item.image} alt="Timeline item" className="w-full h-full object-contain" />
            </button>
            {badge && (
                <div className="absolute top-1 right-1 rounded bg-studio-panel/80 text-studio-textSecondary p-1">
                    {badge}
                </div>
            )}
            {showDiscard && (
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        onDiscard?.();
                    }}
                    className="absolute top-1 right-1 rounded bg-studio-panel/80 text-studio-textSecondary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Discard"
                    type="button"
                >
                    <X size={12} />
                </button>
            )}
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
