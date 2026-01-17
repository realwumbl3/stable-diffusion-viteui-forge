import { useState, useEffect } from 'react'

// Hook to track memory usage
const useMemoryUsage = () => {
  const [memoryUsage, setMemoryUsage] = useState(null)

  useEffect(() => {
    const updateMemoryUsage = () => {
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
}) => {
    const memoryUsage = useMemoryUsage()
    return (
        <div className="studio-toolbar justify-between text-xs text-studio-textSecondary">
            <div className="flex items-center gap-4">
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
                        {progress.total_batches > 1 && (
                            <>
                                <span>•</span>
                                <span>
                                    Batch {progress.current_batch}/{progress.total_batches}
                                </span>
                            </>
                        )}
                        <span>•</span>
                        <span>{Math.round(progress.progress * 100)}%</span>
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
                {memoryUsage && (
                    <span>mem: {memoryUsage}mb</span>
                )}
                <span>Stable Diffusion WebUI</span>
                {progress && loading && <span className="text-studio-accent">{progress.textinfo}</span>}
            </div>
        </div>
    );
};

export default StatusBar;