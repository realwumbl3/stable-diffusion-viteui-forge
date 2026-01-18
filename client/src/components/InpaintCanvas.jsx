import { useState, useRef, useEffect, useCallback } from "react";
import PromptFooter from "./PromptFooter.jsx";
import InpaintToolbar from "./InpaintToolbar.jsx";
import { resolveImageSrc } from "../lib/utils";

// Import our extracted hooks and components
import { useCanvasState } from "./InpaintCanvas/hooks/useCanvasState";
import { useDrawing } from "./InpaintCanvas/hooks/useDrawing";
import { useFileHandling } from "./InpaintCanvas/hooks/useFileHandling";
import { useKeyboardShortcuts } from "./InpaintCanvas/hooks/useKeyboardShortcuts";
import ZoomToolbar from "./InpaintCanvas/components/ZoomToolbar.jsx";
import CanvasArea from "./InpaintCanvas/components/CanvasArea.jsx";
import StatusBar from "./InpaintCanvas/components/StatusBar.jsx";

const InpaintCanvas = ({
    currentImage,
    previewImage,
    livePreview,
    loading,
    progress,
    generationWidth,
    generationHeight,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    // Inpainting specific props
    setInpaintMask,
    brushSize: initialBrushSize = 16,
    drawingMode: initialDrawingMode = "brush",
    // Image upload props
    inputImage,
    onImageUpload,
    // Full resolution inpainting props
    inpaintFullRes,
    inpaintFullResPadding,
    setInpaintFullResPadding,
    // Force edit mode for mask editing
    forceEditMode = false,
}) => {
    const displayImage = previewImage || currentImage;
    const resolvedDisplayImage = resolveImageSrc(displayImage, "images");
    const resolvedInputImage = resolveImageSrc(inputImage, "images");
    const resolvedPreviewImage = resolveImageSrc(previewImage, "images");
    const resolvedCurrentImage = resolveImageSrc(currentImage, "images");

    // Refs
    const canvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const borderCanvasRef = useRef(null);
    const imageRef = useRef(null);
    const panTargetRef = useRef(null);

    // State for brush settings
    const [brushSize, setBrushSize] = useState(initialBrushSize);
    const [drawingMode, setDrawingMode] = useState(initialDrawingMode);
    const [brushHardness, setBrushHardness] = useState(1.0); // 1.0 = 100% opacity/hardness
    const [fillTarget, setFillTarget] = useState("image");
    const [fillTolerance, setFillTolerance] = useState(32);
    const [fillOverfill, setFillOverfill] = useState(0);

    // Initialize hooks
    const canvasState = useCanvasState({
        displayImage: resolvedDisplayImage,
        inputImage: resolvedInputImage,
        livePreview,
        generationWidth,
        generationHeight,
        forceEditMode,
        previewImage: resolvedPreviewImage,
        canvasRef,
        imageRef,
        panTargetRef,
    });

    const drawing = useDrawing({
        inputImage: resolvedInputImage,
        setInpaintMask,
        inpaintFullRes,
        inpaintFullResPadding,
        imageRef,
        maskCanvasRef,
        borderCanvasRef,
        brushSize,
        drawingMode,
        brushHardness,
        fillTarget,
        fillTolerance,
        fillOverfill,
    });

    const fileHandling = useFileHandling({ onImageUpload });

    // Initialize keyboard shortcuts
    useKeyboardShortcuts({
        brushSize,
        setBrushSize,
        brushHardness,
        setBrushHardness,
        setDrawingMode,
        clearMask: drawing.clearMask,
        undoMask: drawing.undoMask,
        redoMask: drawing.redoMask,
    });

    // Mouse event handlers
    const handleDocumentMouseUp = useCallback(() => {
        if (canvasState.isDrawing) {
            canvasState.setIsDrawing(false);
            canvasState.setLastDrawPos(null); // Clear last position when done drawing
            canvasState.setMouseButtonDown(false);
            canvasState.setDrawingStartedOnCanvas(false);
            // Export mask as base64
            const maskDataURL = drawing.getMaskDataUrl();
            if (maskDataURL) {
                setInpaintMask(maskDataURL);
            }
            drawing.saveMaskState();
        }
    }, [canvasState, drawing, setInpaintMask]);

    const handleDocumentMouseDown = useCallback((e) => {
        canvasState.setMouseButtonDown(e.button === 0); // Left mouse button
    }, [canvasState]);

    // Register document-level event listeners
    useEffect(() => {
        document.addEventListener("mouseup", handleDocumentMouseUp);
        document.addEventListener("mousedown", handleDocumentMouseDown);

        return () => {
            document.removeEventListener("mouseup", handleDocumentMouseUp);
            document.removeEventListener("mousedown", handleDocumentMouseDown);
        };
    }, [handleDocumentMouseUp, handleDocumentMouseDown]);

    // Wheel event handling for zoom
    useEffect(() => {
        const panElement = panTargetRef.current;
        const canvasElement = canvasRef.current;
        if (!panElement || !canvasElement || (!displayImage && !inputImage && !livePreview)) return;

        const handleWheelEvent = (e) => {
            if (!e.defaultPrevented) {
                e.preventDefault();
            }

            const zoomFactor = 1.1;
            const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

            // Get mouse position relative to the canvas container
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            canvasState.setZoom((prev) => {
                const newZoom = Math.max(0.1, Math.min(5, prev * delta));
                canvasState.setFitToScreen(false);

                // Calculate the position in the untransformed coordinate system
                // First, undo the current pan offset, then scale by current zoom
                const imageX = (mouseX - canvasState.panOffset.x) / prev;
                const imageY = (mouseY - canvasState.panOffset.y) / prev;

                // Now calculate new pan offset so the same image point stays under cursor
                const newPanX = mouseX - imageX * newZoom;
                const newPanY = mouseY - imageY * newZoom;

                canvasState.setPanOffset({
                    x: newPanX,
                    y: newPanY,
                });

                return newZoom;
            });
        };

        panElement.addEventListener("wheel", handleWheelEvent);
        return () => panElement.removeEventListener("wheel", handleWheelEvent);
    }, [canvasState]);

    // Right-click panning event handlers
    useEffect(() => {
        const canvasElement = panTargetRef.current;
        if (!canvasElement) return;

        const handleRightClickDown = (e) => {
            if (e.button === 2 && inputImage) {
                e.preventDefault();
                e.stopPropagation();
                canvasState.setIsRightClickPanning(true);
                canvasState.setRightClickStartPos({ x: e.clientX, y: e.clientY });
                canvasState.setRightClickStartPan({ ...canvasState.panOffset });
            }
        };

        const handleRightClickMove = (e) => {
            if (canvasState.isRightClickPanning) {
                e.preventDefault();
                e.stopPropagation();
                const deltaX = e.clientX - canvasState.rightClickStartPos.x;
                const deltaY = e.clientY - canvasState.rightClickStartPos.y;
                canvasState.setPanOffset({
                    x: canvasState.rightClickStartPan.x + deltaX,
                    y: canvasState.rightClickStartPan.y + deltaY,
                });
            }
        };

        const handleRightClickUp = (e) => {
            if (canvasState.isRightClickPanning) {
                e.preventDefault();
                e.stopPropagation();
                canvasState.setIsRightClickPanning(false);
            }
        };

        canvasElement.addEventListener("mousedown", handleRightClickDown, true);
        canvasElement.addEventListener("mousemove", handleRightClickMove, true);
        canvasElement.addEventListener("mouseup", handleRightClickUp, true);

        return () => {
            canvasElement.removeEventListener("mousedown", handleRightClickDown, true);
            canvasElement.removeEventListener("mousemove", handleRightClickMove, true);
            canvasElement.removeEventListener("mouseup", handleRightClickUp, true);
        };
    }, [canvasState, inputImage]);

    // File handling functions (delegate to hook)
    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            fileHandling.handleFileSelect(file);
        }
    };

    // Mouse event handlers that use the hooks
    const handleMouseDown = (e) => {
        if (!inputImage) return;
        // Right-click is handled by capture phase listener, skip here
        // Only trigger drawing if clicking directly on the image or canvas elements
        if (e.shiftKey) {
            canvasState.startPan(e);
            return;
        }
        if (drawingMode === "fill") {
            const { x, y } = drawing.getCanvasCoordinates(e);
            drawing.fillAtPoint(x, y);
            return;
        }
        canvasState.setIsDrawing(true);
        canvasState.setMouseButtonDown(true);
        canvasState.setDrawingStartedOnCanvas(true);
        const { x, y } = drawing.getCanvasCoordinates(e);
        canvasState.setLastDrawPos(null); // Reset last position for new stroke
        drawing.drawBrush(x, y);
        canvasState.setLastDrawPos({ x, y });
    };

    const handleMouseMove = (e) => {
        if (!canvasState.isDrawing) return;

        const { x, y } = drawing.getCanvasCoordinates(e);
        drawing.drawBrush(x, y, canvasState.lastDrawPos);
        canvasState.setLastDrawPos({ x, y });
    };

    const handleMouseEnter = (e) => {
        // Resume drawing only if mouse button is held down, we're not currently drawing,
        // drawing was started on canvas, and we're entering over a valid target
        if (
            drawingMode !== "fill" &&
            canvasState.mouseButtonDown &&
            !canvasState.isDrawing &&
            canvasState.drawingStartedOnCanvas &&
            inputImage
        ) {
            // Only resume if entering over a valid target
            canvasState.setIsDrawing(true);
            const { x, y } = drawing.getCanvasCoordinates(e);
            canvasState.setLastDrawPos(null); // Reset last position for new stroke
            drawing.drawBrush(x, y);
            canvasState.setLastDrawPos({ x, y });
        }
    };

    const handleMouseUp = () => {
        // Right-click panning is handled by capture phase listener, skip here
        if (canvasState.isPanning || document.pointerLockElement === panTargetRef.current) {
            canvasState.stopPan();
            return;
        }
        // Drawing logic now handled at document level
    };

    // Helper function to check if we're inside canvas
    const isInsideCanvas = (e) => {
        const canvasContainer = canvasRef.current;
        if (!canvasContainer) return false;
        return canvasContainer.firstChild.contains(e.target);
    };

    // Determine main image source
    const mainImageSrc = canvasState.viewMode === "edit" ? livePreview || inputImage || displayImage : displayImage || inputImage;

    return (
        <main className="studio-canvas relative flex flex-col min-h-0">
            {/* Left Toolbar - Mask Controls */}
            {(displayImage || inputImage) && !canvasState.isDrawing && (
                <div className="absolute top-4 left-4 z-10">
                    <InpaintToolbar
                        drawingMode={drawingMode}
                        setDrawingMode={setDrawingMode}
                        brushSize={brushSize}
                        setBrushSize={setBrushSize}
                        brushHardness={brushHardness}
                        setBrushHardness={setBrushHardness}
                        fillTarget={fillTarget}
                        setFillTarget={setFillTarget}
                        fillTolerance={fillTolerance}
                        setFillTolerance={setFillTolerance}
                        fillOverfill={fillOverfill}
                        setFillOverfill={setFillOverfill}
                        zoom={canvasState.zoom}
                        showMask={canvasState.showMask}
                        setShowMask={canvasState.setMaskVisibility}
                        showBorder={canvasState.showBorder}
                        setShowBorder={canvasState.setShowBorder}
                        inpaintFullRes={inpaintFullRes}
                        inpaintFullResPadding={inpaintFullResPadding}
                        setInpaintFullResPadding={setInpaintFullResPadding}
                        onClear={drawing.clearMask}
                        onUndo={drawing.undoMask}
                        onRedo={drawing.redoMask}
                        canUndo={drawing.canUndo}
                        canRedo={drawing.canRedo}
                    />
                </div>
            )}

            {/* Right Toolbar - Image Controls */}
            {(displayImage || inputImage) && !canvasState.isDrawing && (
                <div className="absolute top-4 right-4 z-10">
                    <ZoomToolbar
                        zoom={canvasState.zoom}
                        showGrid={canvasState.showGrid}
                        setShowGrid={canvasState.setShowGrid}
                        fitToScreen={canvasState.fitToScreen}
                        handleZoomOut={canvasState.handleZoomOut}
                        handleZoomIn={canvasState.handleZoomIn}
                        handleResetZoom={canvasState.handleResetZoom}
                        handleFitToScreen={canvasState.handleFitToScreen}
                        openFileDialog={fileHandling.openFileDialog}
                    />
                </div>
            )}

            {/* Canvas Area */}
            <CanvasArea
                canvasRef={canvasRef}
                panTargetRef={panTargetRef}
                maskCanvasRef={maskCanvasRef}
                borderCanvasRef={borderCanvasRef}
                overlayCanvasRef={overlayCanvasRef}
                imageRef={imageRef}
                displayImage={resolvedDisplayImage}
                inputImage={resolvedInputImage}
                previewImage={resolvedPreviewImage}
                currentImage={resolvedCurrentImage}
                livePreview={livePreview}
                generationWidth={generationWidth}
                generationHeight={generationHeight}
                loading={loading}
                progress={progress}
                zoom={canvasState.zoom}
                panOffset={canvasState.panOffset}
                fitToScreen={canvasState.fitToScreen}
                isPanning={canvasState.isPanning}
                isRightClickPanning={canvasState.isRightClickPanning}
                showGrid={canvasState.showGrid}
                showMask={canvasState.showMask}
                showBorder={canvasState.showBorder}
                inpaintFullRes={inpaintFullRes}
                inpaintFullResPadding={inpaintFullResPadding}
                viewMode={canvasState.viewMode}
                isDrawing={canvasState.isDrawing}
                setLastDrawPos={canvasState.setLastDrawPos}
                isDragOver={fileHandling.isDragOver}
                handleDragOver={fileHandling.handleDragOver}
                handleDragLeave={fileHandling.handleDragLeave}
                handleDrop={fileHandling.handleDrop}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                handleMouseUp={handleMouseUp}
                handleMouseEnter={handleMouseEnter}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                brushHardness={brushHardness}
                setBrushHardness={setBrushHardness}
                openFileDialog={fileHandling.openFileDialog}
            />

            {/* Prompt Footer */}
            <PromptFooter
                prompt={prompt}
                setPrompt={setPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                collapsed={canvasState.footerCollapsed}
                onToggle={() => canvasState.setFooterCollapsed(!canvasState.footerCollapsed)}
            />

            {/* Status Bar */}
            <StatusBar
                displayImage={displayImage}
                inputImage={inputImage}
                zoom={canvasState.zoom}
                brushSize={brushSize}
                brushHardness={brushHardness}
                drawingMode={drawingMode}
                progress={progress}
                loading={loading}
            />

            {/* Hidden file input */}
            <input
                ref={fileHandling.fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
            />
        </main>
    );
};

export default InpaintCanvas;
