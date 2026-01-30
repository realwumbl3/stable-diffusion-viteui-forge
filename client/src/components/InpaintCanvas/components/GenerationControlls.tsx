import styled from "styled-components";
import { SkipForward, Square, RotateCw, Zap } from "lucide-react";
import ResolutionIndicator from "../../ResolutionIndicator";
import NumberSelector from "../../NumberSelector";
import KeyIndicator from "../../KeyIndicator";
import GenerationsNavigator from "../../GenerationsNavigator";
import { cn } from "../../../lib/utils";
import type { ProgressData } from "../../../hooks/useWebSocketProgress";
import type { Generation } from "../../../Api";

export interface CanvasTopControlsProps {
    loading: boolean
    progress: ProgressData | null
    onGenerate: () => void
    canGenerate: boolean
    onSkip: () => void
    onRestart: () => void
    onInterrupt: () => void
    pendingRestart: boolean
    steps: number
    setSteps: (value: number) => void
    count: number
    setCount: (value: number) => void
    width: number
    setWidth: (value: number) => void
    height: number
    setHeight: (value: number) => void
    inputImage: string | null
    pageLocked: boolean
    onToggleLock: () => void
    // Timeline-related props for GenerationsNavigator
    generationQueue: Generation[]
    currentPreview: Generation | null
    latestCommit: Generation | null
    onPreviewSelect: (generation: Generation | null) => void
    onCommit: () => void
    onReject: () => void
  }
  
interface Props {
    controls: CanvasTopControlsProps;
    visible: boolean;
}

const GenerationControlsContainer = styled.div`
    &.generating {
        animation: background-swipe-animation 3s linear infinite;
        background-image: linear-gradient(125deg, transparent 25%, #ffffff61, transparent 75%);
        background-size: 200% 100%;
    }


    @keyframes background-swipe-animation {
        from {
            background-position: -200% 0;
        }
        to {
            background-position: 200% 0;
        }
    }
`;

const CanvasTopControls = ({ controls, visible }: Props) => {
    const {
        loading,
        progress,
        onGenerate,
        canGenerate,
        onSkip,
        onRestart,
        onInterrupt,
        pendingRestart,
        steps,
        setSteps,
        count,
        setCount,
        width,
        setWidth,
        height,
        setHeight,
        inputImage,
        // Timeline props for GenerationsNavigator
        generationQueue,
        currentPreview,
        latestCommit,
        onPreviewSelect,
        onCommit,
        onReject,
    } = controls;

    const isGenerating = loading && progress;
    const currentBatch =
        progress && typeof progress.current_batch === "number" ? progress.current_batch : undefined;
    const totalBatches =
        progress && typeof progress.total_batches === "number" ? progress.total_batches : undefined;

    return (
        <GenerationControlsContainer className={`flex flex-row justify-items-end items-center gap-1 rounded-lg border border-studio-border p-1 pointer-events-auto 
        bg-studio-bg/30 shadow-2xl backdrop-blur 
        transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"} 
        ${isGenerating ? "generating" : ""}`}>
            <div className="flex gap-1">
                <div className="flex flex-col gap-1">
                    <ResolutionIndicator
                        width={width}
                        setWidth={setWidth}
                        height={height}
                        setHeight={setHeight}
                        inputImage={inputImage}
                    />
                    <div className="flex flex-row items-center gap-1 justify-end">
                        <NumberSelector
                            value={steps}
                            onChange={setSteps}
                            min={1}
                            max={100}
                            step={1}
                            label="Steps"
                        />
                        <NumberSelector
                            value={count}
                            onChange={setCount}
                            min={1}
                            max={50}
                            step={1}
                            label="Count"
                        />
                    </div>
                </div>
                <button
                    onClick={onGenerate}
                    disabled={!canGenerate || loading}
                    className={cn(
                        "studio-btn-primary flex flex-col items-center gap-1 px-4 py-2 rounded-md relative self-stretch justify-center line-height-1 simple-block-fill",
                        (!canGenerate || loading) && "opacity-50 cursor-not-allowed"
                    )}
                    type="button"
                >
                    {pendingRestart ? (
                        <>
                            <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Restarting...</span>
                        </>
                    ) : isGenerating ? (
                        <>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="flex items-center text-sm gap-1">{Math.round((progress.progress || 0) * 100)}%
                                    {totalBatches && totalBatches > 1 && currentBatch !== undefined && (
                                        <span className="text-xs text-studio-textSecondary">
                                            ({currentBatch}/{totalBatches})
                                        </span>
                                    )}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-studio-bg/20 rounded-b-md overflow-hidden">
                                <div
                                    className="h-full bg-studio-accentSecondary transition-all duration-300 ease-out"
                                    style={{ width: `${(progress.progress || 0) * 100}%` }}
                                />
                            </div>
                        </>
                    ) : loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">...</span>
                        </>
                    ) : (
                        <>
                            <Zap size={16} />
                            Generate
                            <KeyIndicator keys="G" />
                        </>
                    )}
                </button>
                {loading && !pendingRestart && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onRestart}
                            className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 rounded-md text-sm hover:bg-studio-accent/20 relative"
                            title="Restart generation after interrupting current work"
                            type="button"
                        >
                            <RotateCw size={16} />
                            <KeyIndicator keys="H" />
                            Restart
                        </button>
                        {totalBatches && totalBatches > 1 && currentBatch !== undefined && (
                            <button
                                onClick={onSkip}
                                className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 rounded-md text-sm hover:bg-studio-accent/20 relative"
                                title="Skip current generation (S)"
                                type="button"
                            >
                                <SkipForward size={16} />
                                Skip
                                <KeyIndicator keys="S" />
                            </button>
                        )}
                        <button
                            onClick={onInterrupt}
                            className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 rounded-md text-sm hover:bg-studio-accent/20 relative"
                            title="Interrupt all generations"
                            type="button"
                        >
                            <Square size={16} />
                            End
                            <KeyIndicator keys="G" />
                        </button>
                    </div>
                )}
            </div>

            {/* Generations Navigator */}
            <GenerationsNavigator
                generationQueue={generationQueue}
                currentPreview={currentPreview}
                latestCommit={latestCommit}
                onPreviewSelect={onPreviewSelect}
                onCommit={onCommit}
                onReject={onReject}
            />
        </GenerationControlsContainer>
    );
};

export default CanvasTopControls;
