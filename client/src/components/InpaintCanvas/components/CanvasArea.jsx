import { Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import BrushSettings from "./BrushSettings.jsx";
import InpaintParametersPanel from "./InpaintParametersPanel.jsx";

const CanvasArea = ({
    canvasRef,
    panTargetRef,
    maskCanvasRef,
    borderCanvasRef,
    imageRef,
    displayImage,
    inputImage,
    livePreview,
    generationWidth,
    generationHeight,
    loading,
    progress,
    zoom,
    panOffset,
    fitToScreen,
    isPanning,
    isRightClickPanning,
    showGrid,
    showMask,
    showBorder,
    inpaintFullRes,
    inpaintFullResPadding,
    viewMode,
    isDrawing,
    setLastDrawPos,
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseEnter,
    openFileDialog,
    // Inpaint parameters
    maskBlur,
    setMaskBlur,
    inpaintingFill,
    setInpaintingFill,
    denoisingStrength,
    setDenoisingStrength,
    setInpaintFullRes,
    inpaintingMaskInvert,
    setInpaintingMaskInvert,
    uiVisible = true,
}) => {
    const mainImageSrc = viewMode === "edit" ? livePreview || inputImage || displayImage : displayImage || inputImage;

    // Loading State - Show when generating
    if (loading && !displayImage && !inputImage) {
        return (
            <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="w-24 h-24 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                        {progress ? (
                            <>
                                <p className="text-studio-text text-lg mb-4">
                                    {progress.textinfo || "Generating image..."}
                                </p>
                                <div className="w-64 h-3 bg-studio-bg/30 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-studio-accent transition-all duration-300 ease-out"
                                        style={{ width: `${progress.progress * 100}%` }}
                                    />
                                </div>
                                <p className="text-studio-textSecondary text-sm">
                                    {Math.round(progress.progress * 100)}%
                                    {progress.total_batches > 1 &&
                                        ` • Batch ${progress.current_batch}/${progress.total_batches}`}
                                    {progress.eta && ` • ETA: ${Math.round(progress.eta)}s`}
                                </p>
                            </>
                        ) : (
                            <p className="text-studio-textSecondary text-lg">Starting generation...</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Image Display with Mask Overlay
    if (displayImage || inputImage) {
        return (
            <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
                <div
                    ref={canvasRef}
                    className={cn(
                        "w-full h-full flex items-center justify-center p-8 overflow-hidden relative transition-colors duration-200",
                        isDragOver && "bg-studio-accent/10 border-2 border-dashed border-studio-accent"
                    )}
                    style={{
                        minHeight: "400px",
                        cursor:
                            isPanning || isRightClickPanning
                                ? "grabbing"
                                : "crosshair"
                                ? "crosshair"
                                : isDragOver
                                ? "copy"
                                : "default",
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                {/* Transformed canvas content */}
                <div
                    ref={panTargetRef}
                    className="relative"
                    style={{
                        transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
                        transformOrigin: "center",
                        transition:
                            fitToScreen || isPanning || isRightClickPanning
                                ? "none"
                                : "transform 0.2s ease-out",
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseEnter={handleMouseEnter}
                    onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
                    onMouseLeave={() => {
                        // Reset last draw position when leaving canvas to prevent connecting lines
                        if (isDrawing) {
                            setLastDrawPos(null);
                        }
                    }}
                >
                    {/* Grid Overlay */}
                    {showGrid && (
                        <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                                backgroundImage: `
                      linear-gradient(to right, var(--studio-border) 1px, transparent 1px),
                      linear-gradient(to bottom, var(--studio-border) 1px, transparent 1px)
                    `,
                                backgroundSize: "32px 32px",
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    )}

                    {/* Main Image */}
                    <img
                        key={
                            viewMode === "edit"
                                ? livePreview
                                    ? "live-preview"
                                    : inputImage
                                    ? "input-image"
                                    : "current-image"
                                : "result-image"
                        }
                        ref={imageRef}
                        src={mainImageSrc}
                        alt={viewMode === "edit" ? "Image to inpaint" : "Inpainted result"}
                        className="max-w-none shadow-studio-lg rounded-lg"
                        style={
                            livePreview && generationWidth && generationHeight
                                ? { width: `${generationWidth}px`, height: `${generationHeight}px` }
                                : undefined
                        }
                        draggable={false}
                    />

                    {/* Mask Canvas */}
                    <canvas
                        ref={maskCanvasRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            width: "100%",
                            height: "100%",
                            imageRendering: "pixelated", // Prevent smoothing
                            opacity: showMask ? 0.8 : 0,
                        }}
                    />

                    {/* Border Canvas - Shows padding visualization */}
                    <canvas
                        ref={borderCanvasRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            width: "100%",
                            height: "100%",
                            opacity: inpaintFullRes && inpaintFullResPadding > 0 && showBorder ? 1 : 0,
                        }}
                    />
                </div>

                {/* Brush Settings Panel - Outside transformed content */}
                {(displayImage || inputImage) && !isDrawing && (
                    <div className={`transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                        <BrushSettings
                            brushSize={brushSize}
                            setBrushSize={setBrushSize}
                            brushHardness={brushHardness}
                            setBrushHardness={setBrushHardness}
                            zoom={zoom}
                        />
                    </div>
                )}

                {/* Inpaint Parameters Panel */}
                <div className={`transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <InpaintParametersPanel
                        maskBlur={maskBlur}
                        setMaskBlur={setMaskBlur}
                        inpaintingFill={inpaintingFill}
                        setInpaintingFill={setInpaintingFill}
                        denoisingStrength={denoisingStrength}
                        setDenoisingStrength={setDenoisingStrength}
                        inpaintFullRes={inpaintFullRes}
                        setInpaintFullRes={setInpaintFullRes}
                        inpaintingMaskInvert={inpaintingMaskInvert}
                        setInpaintingMaskInvert={setInpaintingMaskInvert}
                    />
                </div>
                </div>
            </div>
        );
    }

    // Empty State
    return (
        <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
            <div
                ref={canvasRef}
                className={cn(
                    "w-full h-full flex items-center justify-center p-8 overflow-hidden relative transition-colors duration-200",
                    isDragOver && "bg-studio-accent/10 border-2 border-dashed border-studio-accent"
                )}
                style={{
                    minHeight: "400px",
                    cursor: isDragOver ? "copy" : "default",
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="text-center text-studio-text-muted">
                    <div
                        className={cn(
                            "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center mb-4 mx-auto transition-colors duration-200 cursor-pointer",
                            isDragOver
                                ? "border-studio-accent bg-studio-accent/10"
                                : "border-studio-border hover:border-studio-accent/50"
                        )}
                        onClick={openFileDialog}
                        title="Click to upload image or drag & drop here"
                    >
                        <Upload size={32} className="mb-2" />
                        <p className="text-sm font-medium">
                            {isDragOver ? "Drop image here" : "Click to upload"}
                        </p>
                        <p className="text-xs mt-1">or drag & drop image here</p>
                    </div>
                    <>
                        <h3 className="text-lg font-medium mb-2">Ready to Inpaint</h3>
                        <p className="text-sm">Upload an image and start drawing your mask</p>
                    </>
                </div>
            </div>
        </div>
    );
};

export default CanvasArea;