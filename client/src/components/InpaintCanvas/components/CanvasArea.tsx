import { cn, resolveImageSrc } from "../../../lib/utils";
import InpaintParametersPanel from "./InpaintParametersPanel";
import ZoomToolbar from "./ZoomToolbar";
import LivePreview from "./LivePreview";
import type { Bounds, GenerationMode } from "../../../types/components";
import type { ProgressData } from "../../../hooks/useWebSocketProgress";
import { useCanvasSync } from "../../../contexts/CanvasSyncContext";
import EmptyState from "./EmptyState";
import CanvasBrushIndicator from "./CanvasBrushIndicator";
import type { Generation } from "../../../Api";

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
    currentGeneration,
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
    returnPartialCandidates,
    setReturnPartialCandidates,
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
}: {
    canvasRef: React.RefObject<HTMLDivElement>
    panTargetRef: React.RefObject<HTMLDivElement>
    maskCanvasRef: React.RefObject<HTMLCanvasElement>
    overlayCanvasRef?: React.RefObject<HTMLCanvasElement>
    imageRef: React.RefObject<HTMLImageElement>
    displayImage?: string | null
    inputImage?: string | null
    previewImage?: string | null
    previewMaskSnapshot?: string | null
    onClearPreview?: () => void
    currentImage?: string | null
    livePreview?: string | null
    generationWidth?: number
    generationHeight?: number
    loading?: boolean
    progress?: ProgressData | null
    isPanning: boolean
    isRightClickPanning: boolean
    inpaintFullRes: boolean
    inpaintFullResPadding: number
    setInpaintFullResPadding: (value: number) => void
    viewMode: 'edit' | 'result'
    isDrawing: boolean
    setLastDrawPos: (pos: { x: number; y: number } | null) => void
    isDragOver: boolean
    handleDragOver: (e: React.DragEvent) => void
    handleDragLeave: (e: React.DragEvent) => void
    handleDrop: (e: React.DragEvent) => void
    handleMouseDown: (e: React.MouseEvent) => void
    handleMouseMove: (e: React.MouseEvent) => void
    handleMouseUp: (e: React.MouseEvent) => void
    handleMouseEnter: (e: React.MouseEvent) => void
    handlePointerDown?: (e: React.PointerEvent) => void
    handlePointerMove?: (e: React.PointerEvent) => void
    handlePointerUp?: (e: React.PointerEvent) => void
    handlePointerCancel?: (e: React.PointerEvent) => void
    openFileDialog: () => void
    maskBlur: number
    setMaskBlur: (value: number) => void
    inpaintingFill: number
    setInpaintingFill: (value: number) => void
    denoisingStrength: number
    setDenoisingStrength: (value: number) => void
    setInpaintFullRes: (value: boolean) => void
    inpaintingMaskInvert: boolean
    setInpaintingMaskInvert: (value: boolean) => void
    uiVisible?: boolean
    setUiVisible?: (visible: boolean) => void
    scrollWheelZoomIncrement?: number
    generationMode?: GenerationMode
    focusBounds?: Bounds | null
    maskBounds?: Bounds | null
    canvasRefreshKey?: number
    handleZoomOut: () => void
    handleZoomIn: () => void
    handleResetZoom: () => void
    handleFitToScreen: () => void
    currentGeneration?: Generation
    returnPartialCandidates?: boolean
    setReturnPartialCandidates?: (value: boolean) => void
}) => {
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

    // Logic for Partial Candidates Composition
    // If we have partial candidate info, we want to force the 'base' image to be the INPUT image (background)
    // even in 'result' view mode, because the result (displayImage) is only a partial fragment.
    const isPartialCandidate = currentGeneration?.partial_candidates_info && currentGeneration?.partial_candidates_info.length > 0;

    const effectiveBaseImageSrc = isPartialCandidate ? (inputImage || baseImageSrc) : baseImageSrc;

    // If it is a partial candidate, `displayImage` is the partial fragment.
    // `baseImageSrc` logic above defaults to `displayImage` in `result` mode.
    // We override it to `inputImage` if available.

    const mainImageSrc = effectiveBaseImageSrc && canvasRefreshKey > 0
        ? `${effectiveBaseImageSrc}?refresh = ${canvasRefreshKey} `
        : effectiveBaseImageSrc;
    const isInpaintGenerating = generationMode === "inpaint" && Boolean(loading);

    // Loading State - Show when generating
    if (loading && !displayImage && !inputImage) {
        // Create preview overlay for loading state
        return (
            <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
                <div className="relative w-full h-full flex items-center justify-center p-8">
                    <LivePreview
                        showBorder={showBorder}
                        focusBounds={focusBounds}
                        maskBounds={maskBounds}
                        maskBorderMode={maskBorderMode}
                        livePreview={livePreview ?? null}
                        previewMaskSnapshot={previewMaskSnapshot ?? null}
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
                            showBorder={showBorder}
                            focusBounds={focusBounds}
                            maskBounds={maskBounds}
                            maskBorderMode={maskBorderMode}
                            livePreview={livePreview ?? null}
                            previewMaskSnapshot={previewMaskSnapshot ?? null}
                        />

                        {/* Partial Candidate Overlay (Real Implementation) */}
                        {isPartialCandidate && displayImage && (
                            currentGeneration?.partial_candidates_info?.map((info: any, idx: number) => {
                                const [x, y, width, height] = info.paste_to;
                                return (
                                    <div
                                        key={idx}
                                        className="absolute pointer-events-none"
                                        style={{
                                            left: `${x}px`,
                                            top: `${y}px`,
                                            width: `${width}px`,
                                            height: `${height}px`,
                                        }}
                                    >
                                        <img
                                            src={resolveImageSrc(displayImage, "full") || undefined}
                                            className="w-full h-full object-fill rounded-sm"
                                            alt="Partial result"
                                        />
                                    </div>
                                );
                            })
                        )}
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
                                returnPartialCandidates={returnPartialCandidates ?? false}
                                setReturnPartialCandidates={setReturnPartialCandidates ?? (() => { })}
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
