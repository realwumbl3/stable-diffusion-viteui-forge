import { useState, useEffect } from 'react'
import MemoryPanel from '../../MemoryPanel'
import { useCanvasSyncSelector } from '../../../contexts/CanvasSyncContext'
import type { ProgressData } from '../../../hooks/useWebSocketProgress'

// Extend Performance interface for Chrome's memory API
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }
}

// Hook to track memory usage
const useMemoryUsage = (): number | null => {
    const [memoryUsage, setMemoryUsage] = useState<number | null>(null)

    useEffect(() => {
        const updateMemoryUsage = (): void => {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize
                const usedMB = Math.round(used / 1024 / 1024)
                setMemoryUsage(usedMB)
            }
        }

        // Update immediately and then every 5 seconds
        updateMemoryUsage()
        const interval = setInterval(updateMemoryUsage, 5000)

        return () => clearInterval(interval)
    }, [])

    return memoryUsage
}

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m${seconds}s`
}

const StatusBar = ({
    displayImage,
    inputImage,
    progress,
    loading,
}: {
    displayImage?: string | null
    inputImage?: string | null
    progress?: ProgressData | null
    loading?: boolean
}) => {
    const zoom = useCanvasSyncSelector((state) => state.zoom);
    const brushSize = useCanvasSyncSelector((state) => state.brushSize);
    const drawingMode = useCanvasSyncSelector((state) => state.drawingMode);
    const memoryUsage = useMemoryUsage()
    const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
    const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
    const [elapsedMs, setElapsedMs] = useState(0)
    const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null)
    const [isTimerRunning, setIsTimerRunning] = useState(false)

    useEffect(() => {
        if (loading) {
            if (!isTimerRunning) {
                setGenerationStartTime(Date.now())
                setElapsedMs(0)
                setFinalElapsedMs(null)
                setIsTimerRunning(true)
            }
        } else if (isTimerRunning) {
            const now = Date.now()
            const finalDuration = generationStartTime ? now - generationStartTime : elapsedMs
            setElapsedMs(finalDuration)
            setFinalElapsedMs(finalDuration)
            setIsTimerRunning(false)
            setGenerationStartTime(null)
        }
    }, [loading, isTimerRunning, generationStartTime, elapsedMs])

    useEffect(() => {
        if (!isTimerRunning || generationStartTime === null) {
            return
        }

        const interval = setInterval(() => {
            setElapsedMs(Date.now() - generationStartTime)
        }, 500)

        return () => clearInterval(interval)
    }, [generationStartTime, isTimerRunning])

    const elapsedLabel = isTimerRunning
        ? formatDuration(elapsedMs)
        : finalElapsedMs !== null
            ? formatDuration(finalElapsedMs)
            : null

    return (
        <div className="studio-toolbar justify-between text-xs text-studio-textSecondary ps-2 pe-2 flex items-center">
            <div className="flex items-center gap-2">
                <span>Inpaint Canvas [{drawingMode}]</span>
                {(displayImage || inputImage) && (
                    <>
                        <span>•</span>
                        <span>{zoom !== 1 ? `${Math.round(zoom * 100)}%` : "Fit to screen"}</span>
                        {inputImage && (
                            <>
                                <span>•</span>
                                <span>Brush: {brushSize}px</span>
                            </>
                        )}
                    </>
                )}
                {progress && loading && (
                    <>
                        <span>•</span>
                        <span>
                            Step {Number(progress.sampling_step) || 0}/{Number(progress.sampling_steps) || 0}
                        </span>
                        {typeof progress.total_batches === 'number' && progress.total_batches > 1 && (
                            <>
                                <span>•</span>
                                <span>
                                    Batch {Number(progress.current_batch) || 0}/{Number(progress.total_batches) || 0}
                                </span>
                            </>
                        )}
                        <span>•</span>
                        <span>{Math.round((progress.progress || 0) * 100)}%</span>
                        {progress.eta && (
                            <>
                                <span>•</span>
                                <span>ETA~{Math.round(progress.eta as number)}s</span>
                            </>
                        )}
                    </>
                )}
                {elapsedLabel && (
                    <>
                        <span>•</span>
                        <span>Elapsed {elapsedLabel}</span>
                    </>
                )}
            </div>
            <div className="flex items-center gap-4">
                {memoryUsage != null && (
                    <button
                        type="button"
                        onClick={() => setMemoryPanelOpen(true)}
                        className="text-studio-textSecondary hover:text-studio-text hover:underline cursor-pointer transition-colors"
                        title="Open memory usage panel"
                    >
                        UI: {memoryUsage}mb
                    </button>
                )}
                <MemoryPanel open={memoryPanelOpen} onClose={() => setMemoryPanelOpen(false)} />
                <span>StableDiffusion viteUI</span>
                {progress && loading && <span className="text-studio-accent">{String(progress.textinfo || '')}</span>}
            </div>
        </div>
    );
};

export default StatusBar;
