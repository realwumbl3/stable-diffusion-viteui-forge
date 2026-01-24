// VITE UI
import { SkipForward, Square, RotateCw, Lock, Unlock, Zap } from "lucide-react";
import ResolutionIndicator from "../../ResolutionIndicator";
import NumberSelector from "../../NumberSelector";
import OptionPicker from "../../OptionPicker";
import { cn } from "../../../lib/utils";
import type { CanvasTopControlsProps } from "../../../types/components";

interface Props {
    controls: CanvasTopControlsProps;
    visible: boolean;
}

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
        selectedSampler,
        setSelectedSampler,
        cfgScale,
        setCfgScale,
        models,
        selectedModel,
        onModelChange,
        samplers,
        width,
        setWidth,
        height,
        setHeight,
        inputImage,
        pageLocked,
        onToggleLock,
    } = controls;

    return (
        <div className={`pointer-events-auto transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
                <ResolutionIndicator
                    width={width}
                    setWidth={setWidth}
                    height={height}
                    setHeight={setHeight}
                    inputImage={inputImage}
                />

                <button
                    onClick={onGenerate}
                    disabled={!canGenerate || loading}
                    className={cn(
                        "studio-btn-primary flex flex-col items-center gap-1 px-4 py-2 relative",
                        (!canGenerate || loading) && "opacity-50 cursor-not-allowed"
                    )}
                    type="button"
                >
                    {pendingRestart ? (
                        <>
                            <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Restarting...</span>
                        </>
                    ) : loading && progress ? (
                        <>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">{Math.round((progress.progress || 0) * 100)}%</span>
                                {progress.total_batches && progress.total_batches > 1 && (
                                    <span className="text-xs text-studio-textSecondary">
                                        (Batch {progress.current_batch}/{progress.total_batches})
                                    </span>
                                )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-studio-bg/20 rounded-b-md overflow-hidden">
                                <div
                                    className="h-full bg-studio-accent transition-all duration-300 ease-out"
                                    style={{ width: `${(progress.progress || 0) * 100}%` }}
                                />
                            </div>
                        </>
                    ) : loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-studio-bg border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Generating...</span>
                        </>
                    ) : (
                        <>
                            <Zap size={16} />
                            Generate
                        </>
                    )}
                </button>

                {loading && !pendingRestart && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSkip}
                            className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
                            title="Skip current generation"
                            type="button"
                        >
                            <SkipForward size={16} />
                            Skip
                        </button>
                        <button
                            onClick={onRestart}
                            className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
                            title="Restart generation after interrupting current work"
                            type="button"
                        >
                            <RotateCw size={16} />
                            Restart
                        </button>
                        <button
                            onClick={onInterrupt}
                            className="studio-btn-secondary flex flex-col items-center gap-1 px-3 py-1 text-sm hover:bg-studio-accent/20"
                            title="Interrupt all generations"
                            type="button"
                        >
                            <Square size={16} />
                            End
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <NumberSelector
                            value={steps}
                            onChange={setSteps}
                            min={1}
                            max={100}
                            step={1}
                        />
                        <label className="text-xs text-studio-textSecondary font-medium">Steps</label>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <NumberSelector
                            value={count}
                            onChange={setCount}
                            min={1}
                            max={50}
                            step={1}
                        />
                        <label className="text-xs text-studio-textSecondary font-medium">Count</label>
                    </div>

                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-studio-border">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-end gap-2">
                                <OptionPicker
                                    options={models.map((model) => ({
                                        value: model.title,
                                        label: model.model_name
                                    }))}
                                    value={selectedModel}
                                    onChange={onModelChange}
                                    title="Model"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <OptionPicker
                                    options={samplers.map((sampler) => ({
                                        value: sampler.name,
                                        label: sampler.name
                                    }))}
                                    value={selectedSampler}
                                    onChange={setSelectedSampler}
                                    title="Sampler"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <NumberSelector
                                value={cfgScale}
                                onChange={setCfgScale}
                                min={1}
                                max={33}
                                step={1}
                            />
                            <label className="text-xs text-studio-textSecondary font-medium">CFG</label>
                        </div>
                    </div>
                </div>

                <div className="w-px h-6 bg-studio-border mx-2" />

                <button
                    onClick={onToggleLock}
                    className={cn(
                        "studio-btn-ghost p-2",
                        pageLocked && "text-studio-accent"
                    )}
                    title={pageLocked ? "Unlock page (prevents accidental navigation)" : "Lock page (prevents accidental navigation)"}
                    type="button"
                >
                    {pageLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
            </div>
        </div>
    );
};

export default CanvasTopControls;
