import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useRef, useCallback } from "react";
import { cn } from "../lib/utils";
import KeyIndicator from "./KeyIndicator";
import type { Generation } from "../Api";


interface GenerationsNavigatorProps {
  generationQueue: Generation[]
  currentPreview: Generation | null
  latestCommit: Generation | null
  onPreviewSelect: (generation: Generation | null) => void
  onCommit: () => void
  onReject: () => void
}

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
  const lastScrollTimeRef = useRef<number>(0);

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

  const handleScroll = useCallback((event: React.WheelEvent) => {
    if (!hasCandidates || queueCount <= 1) return;

    const now = Date.now();
    if (now - lastScrollTimeRef.current < 150) return; // Throttle to prevent rapid scrolling
    lastScrollTimeRef.current = now;

    const deltaY = event.deltaY;
    if (deltaY > 0) {
      handleNext();
    } else {
      handlePrev();
    }
  }, [hasCandidates, queueCount, handleNext, handlePrev]);

  const label = hasCandidates ? `${safeIndex + 1}/${queueCount}` : "0/0";

  if (!hasCandidates) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-studio-border bg-studio-panel p-2 max-w-min"
      onWheel={handleScroll}
    >
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
            "relative h-9 w-8 rounded-md border border-studio-border text-studio-textSecondary transition-all duration-200 simple-block-fill",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Previous generation (←)"
          type="button"
        >
          <ChevronLeft size={16} className="mx-auto" />
          <KeyIndicator keys="←" />
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "relative h-9 w-8 rounded-md border border-studio-border text-studio-textSecondary transition-all duration-200 simple-block-fill",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Next generation (→)"
          type="button"
        >
          <ChevronRight size={16} className="mx-auto" />
          <KeyIndicator keys="→" />
        </button>
        <div className="flex-1" />
        <button
          onClick={onReject}
          disabled={!canAct}
          className={cn(
            "relative flex items-center gap-2 rounded-md border border-studio-border px-2.5 py-2 text-xs font-medium text-studio-textSecondary transition-all duration-200 simple-block-fill",
            "hover:bg-studio-surface hover:text-studio-text",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Reject current generation (Backspace)"
          type="button"
        >
          <X size={14} />
          Reject
          <KeyIndicator keys="⌫" />
        </button>
        <button
          onClick={onCommit}
          disabled={!canAct}
          className={cn(
            "relative flex items-center gap-2 rounded-md bg-studio-accent px-2.5 py-2 text-xs font-medium text-studio-bg transition-all duration-200 simple-block-fill",
            "hover:bg-studio-accent/80",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Commit current generation (Enter)"
          type="button"
        >
          <Check size={14} />
          Commit
          <KeyIndicator keys="↵" />
        </button>
      </div>
    </div>
  );
};

export default GenerationsNavigator;
