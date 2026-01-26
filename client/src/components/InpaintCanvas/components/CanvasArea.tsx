import { Upload } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "../../../lib/utils";
import InpaintParametersPanel from "./InpaintParametersPanel";
import ZoomToolbar from "./ZoomToolbar";
import FullResBorderOverlay from "./FullResBorderOverlay";
import type { CanvasAreaProps } from "../../../types/components";

const CanvasArea = ({
    canvasRef,
    panTargetRef,
    maskCanvasRef,
    imageRef,
    displayImage,
    inputImage,
    previewImage,
    livePreview,
    loading,
    progress,
    zoom,
    panOffset,
    fitToScreen,
    isPanning,
    isRightClickPanning,
    showGrid,
    setShowGrid,
    showMask,
    setShowMask,
    showBorder,
    setShowBorder,
    maskBorderMode,
    setMaskBorderMode,
    inpaintFullRes,
    inpaintFullResPadding,
    setInpaintFullResPadding,
    viewMode,
    isDrawing,
    setLastDrawPos,
    brushSize,
    setBrushSize,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseEnter,
    drawingMode,
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
    // Always use input image for canvas layout in edit mode - livePreview is purely cosmetic
    const baseImageSrc = viewMode === "edit" ? inputImage || displayImage : displayImage || inputImage;
    const mainImageSrc = baseImageSrc && canvasRefreshKey > 0 
        ? `${baseImageSrc}?refresh=${canvasRefreshKey}` 
        : baseImageSrc;

    const previewOverlay = livePreview ? (
        <div
            className="absolute pointer-events-none"
            style={{
                top: showBorder && inpaintFullRes && inpaintFullResPadding > 0 && focusBounds ? `${focusBounds.y || 0}px` : '0px',
                left: showBorder && inpaintFullRes && inpaintFullResPadding > 0 && focusBounds ? `${focusBounds.x || 0}px` : '0px',
                width: showBorder && inpaintFullRes && inpaintFullResPadding > 0 && focusBounds ? `${focusBounds.width || 0}px` : '100%',
                height: showBorder && inpaintFullRes && inpaintFullResPadding > 0 && focusBounds ? `${focusBounds.height || 0}px` : '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <img
                src={livePreview}
                alt="Live preview"
                className="w-full h-full object-contain shadow-studio-border rounded-lg"
                draggable={false}
            />
        </div>
    ) : null;

    // Brush size indicator state
    const [showBrushIndicator, setShowBrushIndicator] = useState<boolean>(false);
    const cursorPointRef = useRef<HTMLDivElement>(null);
    const brushIndicatorRef = useRef<HTMLDivElement>(null);
    const [isMouseOverCanvas, setIsMouseOverCanvas] = useState<boolean>(false);
    const isMouseOverCanvasRef = useRef<boolean>(isMouseOverCanvas);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const setMouseOverCanvasState = useCallback((value: boolean) => {
        isMouseOverCanvasRef.current = value;
        setIsMouseOverCanvas(value);
    }, []);

    // Show brush indicator when input image is available, drawing mode is supported, and we're in inpaint mode
    const shouldShowBrushIndicator = useMemo(() => {
        return Boolean(inputImage) &&
            generationMode === "inpaint" &&
            (drawingMode === "brush" || drawingMode === "erase");
    }, [inputImage, drawingMode, generationMode]);

    // Sync derived value to state
    useEffect(() => {
        setShowBrushIndicator(shouldShowBrushIndicator);
    }, [shouldShowBrushIndicator]);

    // Alt + scroll for brush size adjustment
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                setBrushSize((prevSize: number) => Math.max(1, Math.min(200, prevSize + scrollWheelZoomIncrement * (e.deltaY > 0 ? -1 : 1))));
            }
        };

        canvasElement.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvasElement.removeEventListener('wheel', handleWheel);
    }, [canvasRef, setBrushSize, scrollWheelZoomIncrement]);

    // Optimized mouse tracking for brush indicator
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        let animationFrameId: number | null = null;

        const updateIndicatorPosition = (e: MouseEvent) => {
            if (!isMouseOverCanvasRef.current) return;

            const cursorPointElement = cursorPointRef.current;
            if (!cursorPointElement) return;

            const rect = canvasElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Store last mouse position for zoom updates
            lastMousePos.current = { x, y };

            // Position the 0x0 cursor point element exactly at mouse position
            if (animationFrameId === null) {
                animationFrameId = requestAnimationFrame(() => {
                    if (cursorPointElement) {
                        cursorPointElement.style.transform = `translate(${x}px, ${y}px)`;
                    }
                    animationFrameId = null;
                });
            }
        };

        const handleMouseEnter = (): void => {
            setMouseOverCanvasState(true);
        };

        const handleMouseLeave = (): void => {
            setMouseOverCanvasState(false);
        };

        canvasElement.addEventListener('mousemove', updateIndicatorPosition);
        canvasElement.addEventListener('mouseenter', handleMouseEnter);
        canvasElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvasElement.removeEventListener('mousemove', updateIndicatorPosition);
            canvasElement.removeEventListener('mouseenter', handleMouseEnter);
            canvasElement.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [canvasRef, brushSize, zoom, setMouseOverCanvasState]);

    // Update cursor position after zoom changes to prevent uncentering
    useEffect(() => {
        if (!isMouseOverCanvasRef.current) return;

        const cursorPointElement = cursorPointRef.current;
        if (!cursorPointElement) return;

        // Update position using stored mouse coordinates (relative to canvas)
        const { x, y } = lastMousePos.current;
        cursorPointElement.style.transform = `translate(${x}px, ${y}px)`;
    }, [zoom]);

    // Loading State - Show when generating
    if (loading && !displayImage && !inputImage) {
        return (
            <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
                <div className="relative w-full h-full flex items-center justify-center p-8">
                    {previewOverlay}
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
                                        style={{ width: `${(progress.progress ?? 0) * 100}%` }}
                                    />
                                </div>
                                <p className="text-studio-textSecondary text-xs">
                                    {Math.round((progress.progress ?? 0) * 100)}%
                                    {typeof progress.total_batches === 'number' && progress.total_batches > 1 &&
                                        ` • Batch ${typeof progress.current_batch === 'number' ? progress.current_batch : '?'}/${progress.total_batches}`}
                                    {typeof progress.eta === 'number' && ` • ETA: ${Math.round(progress.eta)}s`}
                                </p>
                            </>
                        ) : (
                            <p className="text-studio-textSecondary text-sm">Starting generation...</p>
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
                                opacity: showMask ? 0.8 : 0,
                            }}
                        />

                        {previewOverlay}

                        {inpaintFullRes && inpaintFullResPadding > 0 && showBorder && focusBounds && (
                            <FullResBorderOverlay
                                focusBounds={focusBounds}
                                maskBounds={maskBounds}
                                maskBorderMode={maskBorderMode}
                            />
                        )}

                    </div>

                    {/* Cursor Point (0x0 element for precise positioning) */}
                    {showBrushIndicator && (
                        <div
                            ref={cursorPointRef}
                            className="absolute pointer-events-none z-20"
                            style={{
                                left: 0,
                                top: 0,
                                width: 0,
                                height: 0,
                                transform: 'translate(-50%, -50%)',
                                willChange: 'transform',
                            }}
                        >
                            {/* Brush Size Indicator absolutely positioned in center of cursor point */}
                            <div
                                ref={brushIndicatorRef}
                                className={`absolute pointer-events-none border-2 border-opacity-60 rounded-full ${drawingMode === 'erase'
                                    ? 'border-red-500'
                                    : 'border-studio-accent'
                                    }`}
                                style={{
                                    top: `${-(brushSize * zoom) / 2}px`,
                                    left: `${-(brushSize * zoom) / 2}px`,
                                    width: `${brushSize * zoom}px`,
                                    height: `${brushSize * zoom}px`,
                                    backgroundColor: drawingMode === 'erase'
                                        ? 'rgba(239, 68, 68, 0.1)' // Red with opacity
                                        : 'rgba(59, 130, 246, 0.1)', // Light blue with opacity
                            opacity: isMouseOverCanvas ? 1 : 0.7,
                                }}
                            />
                        </div>
                    )}


                    {/* Zoom Toolbar - Bottom Left */}
                    {(displayImage || inputImage) && !isDrawing && setShowGrid && setUiVisible && (
                        <div className={`absolute bottom-1 left-1 z-20 transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                            <ZoomToolbar
                                zoom={zoom}
                                showGrid={showGrid}
                                setShowGrid={setShowGrid}
                                fitToScreen={fitToScreen}
                                handleZoomOut={handleZoomOut}
                                handleZoomIn={handleZoomIn}
                                handleResetZoom={handleResetZoom}
                                handleFitToScreen={handleFitToScreen}
                                openFileDialog={openFileDialog}
                                uiVisible={uiVisible}
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
