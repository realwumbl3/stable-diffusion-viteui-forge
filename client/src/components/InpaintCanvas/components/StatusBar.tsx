import { useState, useEffect } from 'react'
import MemoryPanel from '../../MemoryPanel'
import type { StatusBarProps } from '../../../types/components'

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

const StatusBar = ({
    displayImage,
    inputImage,
    zoom,
    brushSize,
    brushHardness,
    drawingMode,
    progress,
    loading,
}: StatusBarProps) => {
    const memoryUsage = useMemoryUsage()
    const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
    return (
        <div className="studio-toolbar justify-between text-xs text-studio-textSecondary ps-2 pe-2 flex items-center">
            <div className="flex items-center gap-2">
                <span>Inpaint Canvas</span>
                {(displayImage || inputImage) && (
                    <>
                        <span>•</span>
                        <span>{zoom !== 1 ? `${Math.round(zoom * 100)}%` : "Fit to screen"}</span>
                        {inputImage && (
                            <>
                                <span>•</span>
                                <span>Brush: {brushSize}px</span>
                                <span>•</span>
                                <span>Hardness: {Math.round(brushHardness * 100)}%</span>
                                <span>•</span>
                                <span>Mode: {drawingMode}</span>
                            </>
                        )}
                    </>
                )}
                {progress && loading && (
                    <>
                        <span>•</span>
                        <span>
                            Step {progress.sampling_step || 0}/{progress.sampling_steps || 0}
                        </span>
                        {progress.total_batches && progress.total_batches > 1 && (
                            <>
                                <span>•</span>
                                <span>
                                    Batch {progress.current_batch}/{progress.total_batches}
                                </span>
                            </>
                        )}
                        <span>•</span>
                        <span>{Math.round((progress.progress || 0) * 100)}%</span>
                        {progress.eta && (
                            <>
                                <span>•</span>
                                <span>ETA: {Math.round(progress.eta)}s</span>
                            </>
                        )}
                    </>
                )}
            </div>
            <div className="flex items-center gap-4">
                {memoryUsage != null && (
                    <button
                        type="button"
                        onClick={() => setMemoryPanelOpen(true)}
                        className="text-studio-textSecondary hover:text-studio-text hover:underline cursor-pointer transition-colors"
                        title="Open memory panel"
                    >
                        mem: {memoryUsage}mb
                    </button>
                )}
                <MemoryPanel open={memoryPanelOpen} onClose={() => setMemoryPanelOpen(false)} />
                <span>Stable Diffusion viteUI</span>
                {progress && loading && <span className="text-studio-accent">{progress.textinfo}</span>}
            </div>
        </div>
    );
};

export default StatusBar;
