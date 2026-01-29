import { cn } from "../../../lib/utils";
import InpaintParametersPanel from "./InpaintParametersPanel";
import ZoomToolbar from "./ZoomToolbar";
import LivePreview from "./LivePreview";
import type { CanvasAreaProps } from "../../../types/components";
import { useCanvasSync } from "../../../contexts/CanvasSyncContext";
import EmptyState from "./EmptyState";
import CanvasBrushIndicator from "./CanvasBrushIndicator";

const CanvasArea = ({
    canvasRef,
    panTargetRef,
    maskCanvasRef,
    imageRef,
    displayImage,
    inputImage,
    previewImage,
    previewMaskSnapshot,
    livePreview,
    loading,
    progress,
    isPanning,
    isRightClickPanning,
    inpaintFullRes,
    inpaintFullResPadding,
    setInpaintFullResPadding,
    viewMode,
    isDrawing,
    setLastDrawPos,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseEnter,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    openFileDialog,
    onClearPreview,
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
    setUiVisible,
    scrollWheelZoomIncrement = 4,
    generationMode = "txt2img",
    focusBounds = null,
    maskBounds = null,
    canvasRefreshKey = 0,
    handleZoomOut,
    handleZoomIn,
    handleResetZoom,
    handleFitToScreen,
}: CanvasAreaProps) => {
    const {
        zoom,
        panOffset,
        fitToScreen,
        showGrid,
        showMask,
        setShowMask,
        showBorder,
        setShowBorder,
        maskBorderMode,
        setMaskBorderMode,
        setBrushSize,
    } = useCanvasSync();
    // Always use input image for canvas layout in edit mode - livePreview is purely cosmetic
    const baseImageSrc = viewMode === "edit" ? inputImage || displayImage : displayImage || inputImage;
    const mainImageSrc = baseImageSrc && canvasRefreshKey > 0
        ? `${baseImageSrc}?refresh = ${canvasRefreshKey} `
        : baseImageSrc;
    const isInpaintGenerating = generationMode === "inpaint" && Boolean(loading);
    
    // Loading State - Show when generating
    if (loading && !displayImage && !inputImage) {
        // Create preview overlay for loading state
        return (
            <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
                <div className="relative w-full h-full flex items-center justify-center p-8">
                    <LivePreview
                        focusBounds={focusBounds}
                        maskBounds={maskBounds}
                        maskBorderMode={maskBorderMode}
                        livePreview={livePreview ?? null}
                        previewMaskSnapshot={previewMaskSnapshot ?? null}
                        generationMode={generationMode}
                        isInpaintGenerating={isInpaintGenerating}
                    />
                    <div className="text-center z-10">
                        <div className="w-16 h-16 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        {progress ? (
                            <>
                                <p className="text-studio-text text-sm mb-2">
                                    {(progress.textinfo as string | undefined) || "Generating image..."}
                                </p>
                                <div className="w-64 h-2 bg-studio-bg/30 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-studio-accent transition-all duration-300 ease-out"
                                        style={{ width: `${(progress.progress ?? 0) * 100}% ` }}
                                    />
                                </div>
                                <p className="text-studio-textSecondary text-xs">
                                    {Math.round((progress.progress ?? 0) * 100)}%
                                    {typeof progress.total_batches === 'number' && progress.total_batches > 1 &&
                                        ` • Batch ${typeof progress.current_batch === 'number' ? progress.current_batch : '?'}/${progress.total_batches}`}
                                    {typeof progress.eta === 'number' && ` • ETA: ${Math.round(progress.eta)}s`}
                                </p >
                            </>
                        ) : (
                            <p className="text-studio-textSecondary text-sm">Starting generation...</p>
                        )}
                    </div >
                </div >
            </div >
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
                                : generationMode === "inpaint"
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
                        onMouseDown={(e) => {
                            if (previewImage && onClearPreview && e.button === 0) {
                                e.preventDefault();
                                e.stopPropagation();
                                onClearPreview();
                                return;
                            }
                            handleMouseDown(e);
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseEnter={handleMouseEnter}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
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
                                    ? inputImage
                                        ? "input-image"
                                        : "current-image"
                                    : "result-image"
                            }
                            ref={imageRef}
                            src={mainImageSrc || undefined}
                            crossOrigin="anonymous"
                            alt={viewMode === "edit" ? "Image to inpaint" : "Inpainted result"}
                            className="max-w-none shadow-studio-lg rounded-lg"
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
                                opacity: showMask && !previewImage && !isInpaintGenerating ? 0.8 : 0,
                            }}
                        />
                        <LivePreview
                            focusBounds={focusBounds}
                            maskBounds={maskBounds}
                            maskBorderMode={maskBorderMode}
                            livePreview={livePreview ?? null}
                            previewMaskSnapshot={previewMaskSnapshot ?? null}
                            generationMode={generationMode}
                            isInpaintGenerating={isInpaintGenerating}
                        />
                    </div>

                    {/* Cursor Point (0x0 element for precise positioning) */}
                    <CanvasBrushIndicator
                        canvasRef={canvasRef}
                        inputImage={inputImage}
                        generationMode={generationMode}
                        scrollWheelZoomIncrement={scrollWheelZoomIncrement}
                        setBrushSize={setBrushSize}
                    />


                    {/* Zoom Toolbar - Bottom Left */}
                    {(displayImage || inputImage) && !isDrawing && setUiVisible && (
                        <div className={`absolute bottom-1 left-1 z-20 transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                            <ZoomToolbar
                                handleZoomOut={handleZoomOut}
                                handleZoomIn={handleZoomIn}
                                handleResetZoom={handleResetZoom}
                                handleFitToScreen={handleFitToScreen}
                                openFileDialog={openFileDialog}
                                setUiVisible={setUiVisible}
                            />
                        </div>
                    )}

                    {/* Inpaint Parameters Panel - Bottom Right */}
                    {generationMode === "inpaint" && (
                        <div className={`absolute bottom-1 right-1 z-20 transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
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
                                inpaintFullResPadding={inpaintFullResPadding}
                                setInpaintFullResPadding={setInpaintFullResPadding}
                                maskBorderMode={maskBorderMode}
                                setMaskBorderMode={setMaskBorderMode}
                                showMask={showMask}
                                setShowMask={setShowMask}
                                showBorder={showBorder}
                                setShowBorder={setShowBorder}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Empty State
    return <EmptyState
        canvasRef={canvasRef}
        isDragOver={isDragOver}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        openFileDialog={openFileDialog}
    />
};

export default CanvasArea;
