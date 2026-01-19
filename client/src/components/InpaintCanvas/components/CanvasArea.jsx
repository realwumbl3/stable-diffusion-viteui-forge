import { Upload } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "../../../lib/utils";
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
    scrollWheelZoomIncrement = 4,
}) => {
    const mainImageSrc = viewMode === "edit" ? livePreview || inputImage || displayImage : displayImage || inputImage;

    // Brush size indicator state
    const [showBrushIndicator, setShowBrushIndicator] = useState(false);
    const cursorPointRef = useRef(null);
    const brushIndicatorRef = useRef(null);
    const isMouseOverCanvas = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Supported tools that show brush indicator
    const supportedBrushTools = ["brush", "erase"];

    // Show brush indicator when input image is available and drawing mode is supported
    useEffect(() => {
        if (inputImage && supportedBrushTools.includes(drawingMode)) {
            setShowBrushIndicator(true);
        } else {
            setShowBrushIndicator(false);
        }
    }, [inputImage, drawingMode]);

    // Alt + scroll for brush size adjustment
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const handleWheel = (e) => {
            if (e.altKey) {
                e.preventDefault();
                setBrushSize(prevSize => Math.max(1, Math.min(200, prevSize + scrollWheelZoomIncrement * (e.deltaY > 0 ? -1 : 1))));
            }
        };

        canvasElement.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvasElement.removeEventListener('wheel', handleWheel);
    }, [canvasRef, setBrushSize]);

    // Optimized mouse tracking for brush indicator
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        let animationFrameId = null;

        const updateIndicatorPosition = (e) => {
            if (!isMouseOverCanvas.current) return;

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
                    cursorPointElement.style.transform = `translate(${x}px, ${y}px)`;
                    animationFrameId = null;
                });
            }
        };

        const handleMouseEnter = () => {
            isMouseOverCanvas.current = true;
        };

        const handleMouseLeave = () => {
            isMouseOverCanvas.current = false;
        };

        canvasElement.addEventListener('mousemove', updateIndicatorPosition);
        canvasElement.addEventListener('mouseenter', handleMouseEnter);
        canvasElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvasElement.removeEventListener('mousemove', updateIndicatorPosition);
            canvasElement.removeEventListener('mouseenter', handleMouseEnter);
            canvasElement.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [canvasRef, brushSize, zoom]);

    // Update cursor position after zoom changes to prevent uncentering
    useEffect(() => {
        if (!isMouseOverCanvas.current) return;

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
                            crossOrigin="anonymous"
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
                                className={`absolute pointer-events-none border-2 border-opacity-60 rounded-full ${
                                    drawingMode === 'erase'
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
                                    opacity: isMouseOverCanvas.current ? 1 : 0.7,
                                }}
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
                            inpaintFullResPadding={inpaintFullResPadding}
                            setInpaintFullResPadding={setInpaintFullResPadding}
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