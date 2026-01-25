// VITE UI
import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "../lib/utils";
import type { GenerationsNavigatorProps } from "../types/components";

const GenerationsNavigator = ({
  generationQueue,
  currentPreview,
  latestCommit,
  onPreviewSelect,
  onCommit,
  onReject,
}: GenerationsNavigatorProps) => {
  const queueCount = generationQueue.length;
  const currentIndex = generationQueue.findIndex((gen) => gen.genid === currentPreview?.genid);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const hasCandidates = queueCount > 0;
  const canGoPrev = hasCandidates && queueCount > 1;
  const canGoNext = hasCandidates && queueCount > 1;
  const canAct = Boolean(currentPreview);
  const previousPreviewRef = useRef<GenerationsNavigatorProps["currentPreview"] | undefined>(undefined);

  const selectAtIndex = (index: number) => {
    const target = generationQueue[index];
    if (target) {
      onPreviewSelect(target);
    }
  };

  const handlePrev = () => {
    if (!hasCandidates) return;
    const nextIndex = (safeIndex - 1 + queueCount) % queueCount;
    selectAtIndex(nextIndex);
  };

  const handleNext = () => {
    if (!hasCandidates) return;
    const nextIndex = (safeIndex + 1) % queueCount;
    selectAtIndex(nextIndex);
  };

  const label = hasCandidates ? `${safeIndex + 1}/${queueCount}` : "0/0";

  if (!hasCandidates) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-studio-border bg-studio-panel p-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-studio-textSecondary">
        <span>Navigator</span>
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {latestCommit && (
            <button
              onMouseEnter={() => {
                previousPreviewRef.current = currentPreview ?? null;
                onPreviewSelect(latestCommit);
              }}
              onMouseLeave={() => {
                onPreviewSelect(previousPreviewRef.current ?? null);
                previousPreviewRef.current = undefined;
              }}
              className="rounded border border-studio-border p-1 text-studio-textSecondary transition-all duration-200 hover:bg-studio-surface hover:text-studio-text"
              title="Peek latest commit"
              type="button"
            >
              <Eye size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={cn(
            "h-8 w-8 rounded-md border border-studio-border text-studio-textSecondary transition-all duration-200",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Previous generation"
          type="button"
        >
          <ChevronLeft size={16} className="mx-auto" />
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "h-8 w-8 rounded-md border border-studio-border text-studio-textSecondary transition-all duration-200",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Next generation"
          type="button"
        >
          <ChevronRight size={16} className="mx-auto" />
        </button>
        <div className="flex-1" />
        <button
          onClick={onReject}
          disabled={!canAct}
          className={cn(
            "flex items-center gap-2 rounded-md border border-studio-border px-2.5 py-1.5 text-xs font-medium text-studio-textSecondary transition-all duration-200",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Reject current generation"
          type="button"
        >
          <X size={14} />
          Reject
        </button>
        <button
          onClick={onCommit}
          disabled={!canAct}
          className={cn(
            "flex items-center gap-2 rounded-md bg-studio-accent px-2.5 py-1.5 text-xs font-medium text-studio-bg transition-all duration-200",
            "hover:bg-studio-accent/80",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Commit current generation"
          type="button"
        >
          <Check size={14} />
          Commit
        </button>
      </div>
    </div>
  );
};

export default GenerationsNavigator;
