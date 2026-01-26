import { useState, useRef, useEffect, useCallback } from "react";
import PromptComposer from "../../PromptComposer";
import InpaintToolbar from "./InpaintToolbar";
import Img2ImgToolbar from "./Img2ImgToolbar";
import { resolveImageSrc } from "../../../lib/utils";
import GenerationControlls from "./GenerationControlls";

// Import our extracted hooks and components
import { useCanvasState } from "../hooks/useCanvasState";
import { useDrawing } from "../hooks/useDrawing";
import { useFileHandling } from "../hooks/useFileHandling";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import CanvasArea from "./CanvasArea";
import StatusBar from "./StatusBar";
import type { InpaintCanvasProps } from "../../../types/components";

const InpaintCanvas = ({
    currentImage,
    previewImage,
    onClearPreview,
    livePreview,
    loading,
    progress,
    generationWidth,
    generationHeight,
    composerNodes,
    onComposerNodesChange,
    promptMode,
    onPromptModeChange,
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
    // Generation mode
    generationMode = "txt2img",
    // Canvas refresh key
    canvasRefreshKey = 0,
    canvasControls,
}: InpaintCanvasProps) => {
    const displayImage = previewImage || currentImage;
    const resolvedDisplayImage = resolveImageSrc(displayImage, "full");
    const resolvedInputImage = resolveImageSrc(inputImage || null, "full");
    const resolvedPreviewImage = resolveImageSrc(previewImage || null, "full");
    const resolvedCurrentImage = resolveImageSrc(currentImage || null, "full");

    // Refs
    const canvasRef = useRef<HTMLDivElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const panTargetRef = useRef<HTMLDivElement>(null);

    // State for brush settings
    const [brushSize, setBrushSize] = useState<number>(initialBrushSize);
    const [drawingMode, setDrawingMode] = useState<string>(initialDrawingMode);
    const [brushHardness, setBrushHardness] = useState<number>(1.0); // 1.0 = 100% opacity/hardness
    const [fillTarget, setFillTarget] = useState<string>("image");
    const [fillTolerance, setFillTolerance] = useState<number>(32);
    const [fillOverfill, setFillOverfill] = useState<number>(0);

    // UI visibility state
    const [uiVisible, setUiVisible] = useState<boolean>(true);

    // Initialize hooks
    const canvasState = useCanvasState({
        displayImage: resolvedDisplayImage,
        inputImage: resolvedInputImage,
        livePreview: Boolean(livePreview),
        generationWidth: generationWidth ?? null,
        generationHeight: generationHeight ?? null,
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
        brushSize,
        drawingMode,
        brushHardness,
        fillTarget,
        fillTolerance,
        fillOverfill,
        generationWidth: generationWidth ?? null,
        generationHeight: generationHeight ?? null,
    });

    const fileHandling = useFileHandling({ onImageUpload });
    // Destructure to avoid ref access warnings
    const { isDragOver, fileInputRef, openFileDialog, handleDragOver, handleDragLeave, handleDrop } = fileHandling;

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
        showMask: canvasState.showMask,
        setMaskVisibility: canvasState.setMaskVisibility,
        showBorder: canvasState.showBorder,
        setShowBorder: canvasState.setShowBorder,
        handleFitToScreen: canvasState.handleFitToScreen,
    });

    // Mouse event handlers
    const handleDocumentMouseUp = useCallback((): void => {
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

    const handleDocumentMouseDown = useCallback((e: MouseEvent): void => {
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

        const handleWheelEvent = (e: WheelEvent): void => {
            // Skip zoom if Alt is held (reserved for brush size adjustment)
            if (e.altKey) return;

            if (!e.defaultPrevented) {
                e.preventDefault();
            }

            const zoomFactor = 1.1;
            const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

            // Get mouse position relative to the canvas container
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            canvasState.setZoom((prev: number) => {
                const newZoom = Math.max(0.01, Math.min(5.0, prev * delta));
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
    }, [canvasState, displayImage, inputImage, livePreview]);


    // File handling functions (delegate to hook)
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            fileHandling.handleFileSelect(file);
        }
    };

    // Mouse event handlers that use the hooks
    const handleMouseDown = (e: React.MouseEvent): void => {
        if (!(inputImage || displayImage || livePreview)) return;

        // Handle right-click panning
        if (e.button === 2) {
            e.preventDefault();
            e.stopPropagation();
            canvasState.setPanType('right-click');
            panTargetRef.current?.requestPointerLock();
            canvasState.setIsRightClickPanning(true);
            return;
        }

        // Only trigger drawing if clicking directly on the image or canvas elements and we're in inpaint mode
        if (e.shiftKey) {
            canvasState.startPan(e);
            return;
        }
        if (generationMode === "inpaint") {
            if (drawingMode === "fill") {
                const { x, y } = drawing.getCanvasCoordinates(e as React.MouseEvent<HTMLImageElement>);
                drawing.fillAtPoint(x, y);
                return;
            }
            canvasState.setIsDrawing(true);
            canvasState.setMouseButtonDown(true);
            canvasState.setDrawingStartedOnCanvas(true);
            const { x, y } = drawing.getCanvasCoordinates(e as React.MouseEvent<HTMLImageElement>);
            canvasState.setLastDrawPos(null); // Reset last position for new stroke
            drawing.drawBrush(x, y, null); // Start new stroke
            canvasState.setLastDrawPos({ x, y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent): void => {
        if (!canvasState.isDrawing || generationMode !== "inpaint") return;

        const { x, y } = drawing.getCanvasCoordinates(e as React.MouseEvent<HTMLImageElement>);
        const lastPos = canvasState.lastDrawPosRef.current;
        if (lastPos) {
            drawing.drawBrush(x, y, lastPos);
        } else {
            drawing.drawBrush(x, y, null);
        }
        canvasState.setLastDrawPos({ x, y });
    };

    const handleMouseEnter = (e: React.MouseEvent): void => {
        // Resume drawing only if mouse button is held down, we're not currently drawing,
        // drawing was started on canvas, we're in inpaint mode, and we're entering over a valid target
        if (
            drawingMode !== "fill" &&
            canvasState.mouseButtonDown &&
            !canvasState.isDrawing &&
            canvasState.drawingStartedOnCanvas &&
            inputImage &&
            generationMode === "inpaint"
        ) {
            // Only resume if entering over a valid target
            canvasState.setIsDrawing(true);
            const { x, y } = drawing.getCanvasCoordinates(e as React.MouseEvent<HTMLImageElement>);
            canvasState.setLastDrawPos(null); // Reset last position for resumed stroke
            drawing.drawBrush(x, y, null); // Resume drawing at new position
            canvasState.setLastDrawPos({ x, y });
        }
    };

    const handleMouseUp = (e: React.MouseEvent): void => {
        // Handle right-click panning release
        if (canvasState.isRightClickPanning && e?.button === 2) {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            canvasState.setIsRightClickPanning(false);
            return;
        }

        // Handle shift panning release
        if (canvasState.isPanning || document.pointerLockElement === panTargetRef.current) {
            canvasState.stopPan();
            return;
        }
        // Drawing logic now handled at document level
    };


    return (
        <main className="studio-canvas relative flex flex-col min-h-0 flex-1 overflow-hidden">
            <CanvasArea
                canvasRef={canvasRef}
                panTargetRef={panTargetRef}
                maskCanvasRef={maskCanvasRef}
                overlayCanvasRef={overlayCanvasRef}
                imageRef={imageRef}
                displayImage={resolvedDisplayImage}
                inputImage={resolvedInputImage}
                previewImage={resolvedPreviewImage}
                onClearPreview={onClearPreview}
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
                setShowGrid={canvasState.setShowGrid}
                showMask={canvasState.showMask}
                showBorder={canvasState.showBorder}
                maskBorderMode={canvasState.maskBorderMode}
                setMaskBorderMode={canvasState.setMaskBorderMode}
                handleZoomOut={canvasState.handleZoomOut}
                handleZoomIn={canvasState.handleZoomIn}
                handleResetZoom={canvasState.handleResetZoom}
                handleFitToScreen={canvasState.handleFitToScreen}
                setUiVisible={setUiVisible}
                inpaintFullRes={inpaintFullRes}
                inpaintFullResPadding={inpaintFullResPadding}
                setInpaintFullResPadding={setInpaintFullResPadding}
                canvasRefreshKey={canvasRefreshKey}
                viewMode={canvasState.viewMode}
                isDrawing={canvasState.isDrawing}
                setLastDrawPos={canvasState.setLastDrawPos}
                isDragOver={isDragOver}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                handleMouseUp={handleMouseUp}
                handleMouseEnter={handleMouseEnter}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                brushHardness={brushHardness}
                setBrushHardness={setBrushHardness}
                drawingMode={drawingMode}
                openFileDialog={openFileDialog}
                maskBlur={maskBlur}
                setMaskBlur={setMaskBlur}
                inpaintingFill={inpaintingFill}
                setInpaintingFill={setInpaintingFill}
                denoisingStrength={denoisingStrength}
                setDenoisingStrength={setDenoisingStrength}
                setInpaintFullRes={setInpaintFullRes}
                inpaintingMaskInvert={inpaintingMaskInvert}
                setInpaintingMaskInvert={setInpaintingMaskInvert}
                uiVisible={uiVisible}
                generationMode={generationMode}
                focusBounds={drawing.focusBounds}
                maskBounds={drawing.maskBounds}
            />
            {/* Left Toolbar - Mode-specific Controls */}
            {((generationMode === "inpaint" && (displayImage || inputImage)) || generationMode === "img2img") && !canvasState.isDrawing && (
                <div className={`absolute top-1 left-1 z-10 transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {generationMode === "inpaint" ? (
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
                            onClear={drawing.clearMask}
                            onUndo={drawing.undoMask}
                            onRedo={drawing.redoMask}
                            canUndo={drawing.canUndo}
                            canRedo={drawing.canRedo}
                        />
                    ) : generationMode === "img2img" ? (
                        <Img2ImgToolbar
                            denoisingStrength={denoisingStrength}
                            setDenoisingStrength={setDenoisingStrength}
                        />
                    ) : null}
                </div>
            )}

            <div className="absolute top-1 right-1 z-20 pointer-events-auto">
                {canvasControls && (
                    <GenerationControlls controls={canvasControls} visible={uiVisible} />
                )}
            </div>

            {/* Prompt Footer */}
            <PromptComposer
                initialData={composerNodes}
                onNodesChange={onComposerNodesChange}
                mode={promptMode}
                onModeChange={onPromptModeChange}
                collapsed={canvasState.footerCollapsed}
                onToggle={() => canvasState.setFooterCollapsed(!canvasState.footerCollapsed)}
            />

            {/* Status Bar */}
            <StatusBar
                displayImage={displayImage || undefined}
                inputImage={inputImage || undefined}
                zoom={canvasState.zoom}
                brushSize={brushSize}
                brushHardness={brushHardness}
                drawingMode={drawingMode}
                progress={progress || undefined}
                loading={loading}
            />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
            />
        </main>
    );
};

export default InpaintCanvas;
