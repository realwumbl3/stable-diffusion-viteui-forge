import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import PromptComposer from "../../PromptComposer";
import InpaintToolbar from "./InpaintToolbar";
import Img2ImgToolbar from "./Img2ImgToolbar";
import { resolveImageSrc } from "../../../lib/utils";
import GenerationControlls from "./GenerationControlls";

// Import our extracted hooks and components
import { useDrawing } from "../hooks/useDrawing";
import { useFileHandling } from "../hooks/useFileHandling";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import CanvasArea from "./CanvasArea";
import StatusBar from "./StatusBar";
import { useCanvasPointerEvents } from "../hooks/useCanvasPointerEvents.tsx";
import { useCanvasSync } from "../../../contexts/CanvasSyncContext";
import type { InpaintCanvasProps } from "../../../types/components";

const InpaintCanvas = ({
    currentImage,
    previewImage,
    onClearPreview,
    previewMaskSnapshot,
    livePreview,
    loading,
    progress,
    generationWidth,
    generationHeight,
    composerNodes,
    onComposerNodesChange,
    promptMode,
    onPromptModeChange,
    workspaceId,
    // Inpainting specific props
    setInpaintMask,
    // Image upload props
    inputImage,
    onImageUpload,
    onRegisterMaskSnapshotProvider,
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
    footerCollapsed,
    onToggleFooter,
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

    // UI visibility state
    const [uiVisible, setUiVisible] = useState<boolean>(true);

    // Drawing state (previously in useCanvasState)
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panType, setPanType] = useState<'shift' | 'right-click' | null>(null);
    const lastDrawPosRef = useRef<{ x: number; y: number } | null>(null);
    const [mouseButtonDown, setMouseButtonDown] = useState(false);
    const [drawingStartedOnCanvas, setDrawingStartedOnCanvas] = useState(false);
    const [isRightClickPanning, setIsRightClickPanning] = useState(false);
    const [rightClickStartPos, setRightClickStartPos] = useState({ x: 0, y: 0 });
    const [rightClickStartPan, setRightClickStartPan] = useState({ x: 0, y: 0 });

    const setLastDrawPos = useCallback((pos: { x: number; y: number } | null) => {
        lastDrawPosRef.current = pos;
    }, []);

    // Canvas sync state
    const {
        setZoom,
        setFitToScreen,
        panOffset,
        setPanOffset,
        brushSize,
        setBrushSize,
        drawingMode,
        setDrawingMode,
        brushHardness,
        setBrushHardness,
        fillTarget,
        fillTolerance,
        fillOverfill,
        showBorder,
        setShowBorder,
        showMask,
        setShowMask,
    } = useCanvasSync();

    const effectiveFooterCollapsed = footerCollapsed;
    const handleToggleFooter = useCallback(() => {
        if (onToggleFooter) {
            onToggleFooter();
            return;
        }
        // Footer toggle is handled by parent component
    }, [onToggleFooter]);

    // View mode calculation (previously in useCanvasState)
    const isTimelinePreview = Boolean(resolvedPreviewImage);
    const viewMode = useMemo(() => {
        if (isTimelinePreview) {
            return "result";
        }
        if (forceEditMode || livePreview) {
            return "edit";
        }
        if (resolvedDisplayImage) {
            return "result";
        }
        if (resolvedInputImage) {
            return "edit";
        }
        return "edit";
    }, [forceEditMode, isTimelinePreview, livePreview, resolvedDisplayImage, resolvedInputImage]);

    // Utility functions (previously in useCanvasState)
    const getDisplayDimensions = useCallback(() => {
        if (!imageRef.current) {
            return { width: 1, height: 1 };
        }

        // Always use input image dimensions for canvas sizing in edit mode
        // Live preview should be purely cosmetic and not affect canvas layout
        if (viewMode === "edit" && resolvedInputImage) {
            return {
                width: imageRef.current.naturalWidth || 1,
                height: imageRef.current.naturalHeight || 1,
            };
        }

        if (livePreview && generationWidth && generationHeight) {
            return { width: generationWidth, height: generationHeight };
        }

        return {
            width: imageRef.current.naturalWidth || 1,
            height: imageRef.current.naturalHeight || 1,
        };
    }, [viewMode, resolvedInputImage, livePreview, generationWidth, generationHeight, imageRef]);

    const calculateFitToScreenScale = useCallback(() => {
        if (!canvasRef.current || !imageRef.current) return 1;

        const container = canvasRef.current.getBoundingClientRect();
        const { width: imageWidth, height: imageHeight } = getDisplayDimensions();

        // Ensure we have valid image dimensions (minimum 1px to prevent division by zero)
        if (imageWidth <= 0 || imageHeight <= 0) return 1;

        // Get available space (accounting for fit-to-screen padding)
        const availableWidth = Math.max(container.width - 16, 1);
        const availableHeight = Math.max(container.height - 16, 1);

        // Calculate scale to fit the longest side
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);

        // Add bounds checking to prevent extreme zoom values
        return Math.max(0.01, Math.min(scale, 5.0));
    }, [canvasRef, imageRef, getDisplayDimensions]);

    const calculateCenterOffset = useCallback(() => {
        return { x: -8, y: 0 };
    }, []);

    // Zoom functions (previously in useCanvasState)
    const handleZoomIn = useCallback(() => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.min(prev * zoomFactor, 5.0);
            setFitToScreen(false);

            setPanOffset((prevPan) => {
                const centerX = 0;
                const centerY = 0;
                const imageX = (centerX - prevPan.x) / prev;
                const imageY = (centerY - prevPan.y) / prev;
                const newPanX = centerX - imageX * newZoom;
                const newPanY = centerY - imageY * newZoom;
                return { x: newPanX, y: newPanY };
            });

            return newZoom;
        });
    }, [setFitToScreen, setPanOffset, setZoom]);

    const handleZoomOut = useCallback(() => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.max(prev / zoomFactor, 0.01);
            setFitToScreen(false);

            setPanOffset((prevPan) => {
                const centerX = 0;
                const centerY = 0;
                const imageX = (centerX - prevPan.x) / prev;
                const imageY = (centerY - prevPan.y) / prev;
                const newPanX = centerX - imageX * newZoom;
                const newPanY = centerY - imageY * newZoom;
                return { x: newPanX, y: newPanY };
            });

            return newZoom;
        });
    }, [setFitToScreen, setPanOffset, setZoom]);

    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setPanOffset(calculateCenterOffset());
        setFitToScreen(true);
    }, [calculateCenterOffset]);

    const handleFitToScreen = useCallback(() => {
        if (!canvasRef.current || !imageRef.current) return;

        const scale = calculateFitToScreenScale();
        setZoom(scale);
        setPanOffset(calculateCenterOffset());
        setFitToScreen(true);
    }, [canvasRef, imageRef, calculateFitToScreenScale, calculateCenterOffset]);

    // Custom mask setter (previously in useCanvasState)
    const setMaskVisibility = useCallback((newVisibility: boolean) => {
        setShowMask(newVisibility);
    }, [setShowMask]);

    const drawing = useDrawing({
        workspaceId,
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

    const { getCroppedMaskSnapshot } = drawing;
    useEffect(() => {
        if (!onRegisterMaskSnapshotProvider) {
            console.error("No mask snapshot provider found");
            return;
        }
        onRegisterMaskSnapshotProvider(getCroppedMaskSnapshot);
        return () => onRegisterMaskSnapshotProvider(null);
    }, [getCroppedMaskSnapshot, onRegisterMaskSnapshotProvider]);

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
        showMask,
        setMaskVisibility,
        showBorder,
        setShowBorder,
        handleFitToScreen,
    });

    // Mouse event handlers
    const handleDocumentMouseUp = useCallback((e: MouseEvent): void => {
        if (isRightClickPanning && e.button === 2) {
            console.debug("[VITEUI PANNING] document mouseup", {
                button: e.button,
                pointerLocked: Boolean(document.pointerLockElement),
            });
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            setIsRightClickPanning(false);
            return;
        }

        if (isDrawing) {
            setIsDrawing(false);
            setLastDrawPos(null); // Clear last position when done drawing
            setMouseButtonDown(false);
            setDrawingStartedOnCanvas(false);
            // Export mask as base64
            const maskDataURL = drawing.getMaskDataUrl();
            if (maskDataURL) {
                setInpaintMask(maskDataURL);
            }
            drawing.saveMaskState();
        }
    }, [isRightClickPanning, setIsRightClickPanning, isDrawing, setIsDrawing, setLastDrawPos, setMouseButtonDown, setDrawingStartedOnCanvas, drawing, setInpaintMask]);

    const handleDocumentMouseDown = useCallback((e: MouseEvent): void => {
        setMouseButtonDown(e.button === 0); // Left mouse button
    }, []);

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

            // Get mouse position relative to the canvas center
            // For zoom-to-cursor to work properly, we need coordinates relative to the transform origin
            const rect = canvasElement.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mouseX = e.clientX - rect.left - centerX;
            const mouseY = e.clientY - rect.top - centerY;

            setZoom((prev: number) => {
                const newZoom = Math.max(0.01, Math.min(5.0, prev * delta));
                setFitToScreen(false);

                // Calculate the position in the untransformed coordinate system
                // First, undo the current pan offset, then scale by current zoom
                const imageX = (mouseX - panOffset.x) / prev;
                const imageY = (mouseY - panOffset.y) / prev;

                // Now calculate new pan offset so the same image point stays under cursor
                const newPanX = mouseX - imageX * newZoom;
                const newPanY = mouseY - imageY * newZoom;

                setPanOffset({
                    x: newPanX,
                    y: newPanY,
                });

                return newZoom;
            });
        };

        panElement.addEventListener("wheel", handleWheelEvent);
        return () => panElement.removeEventListener("wheel", handleWheelEvent);
    }, [panOffset, displayImage, inputImage, livePreview]);


    // File handling functions (delegate to hook)
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            fileHandling.handleFileSelect(file);
        }
    };

    // All canvas pointer event handlers
    const pointerEventHandlers = useCanvasPointerEvents({
        panTargetRef,
        canvasState: {
            panOffset,
            rightClickStartPos,
            setPanOffset,
            setPanType,
            setIsRightClickPanning,
            setIsPanning,
            isRightClickPanning,
            isPanning,
            rightClickStartPan,
            setRightClickStartPos,
            setRightClickStartPan,
            lastDrawPosRef,
            setLastDrawPos,
            isDrawing,
            setIsDrawing,
            mouseButtonDown,
            setMouseButtonDown,
            drawingStartedOnCanvas,
            setDrawingStartedOnCanvas,
            panType,
        },
        drawing,
        inputImage,
        generationMode,
        drawingMode,
    });


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
                previewMaskSnapshot={previewMaskSnapshot}
                onClearPreview={onClearPreview}
                currentImage={resolvedCurrentImage}
                livePreview={livePreview}
                generationWidth={generationWidth}
                generationHeight={generationHeight}
                loading={loading}
                progress={progress}
                isPanning={isPanning}
                isRightClickPanning={isRightClickPanning}
                handleZoomOut={handleZoomOut}
                handleZoomIn={handleZoomIn}
                handleResetZoom={handleResetZoom}
                handleFitToScreen={handleFitToScreen}
                setUiVisible={setUiVisible}
                inpaintFullRes={inpaintFullRes}
                inpaintFullResPadding={inpaintFullResPadding}
                setInpaintFullResPadding={setInpaintFullResPadding}
                canvasRefreshKey={canvasRefreshKey}
                viewMode={viewMode}
                isDrawing={isDrawing}
                setLastDrawPos={setLastDrawPos}
                isDragOver={isDragOver}
                handleDragOver={handleDragOver as (e: React.DragEvent) => void}
                handleDragLeave={handleDragLeave as (e: React.DragEvent) => void}
                handleDrop={handleDrop as (e: React.DragEvent) => void}
                handleMouseDown={pointerEventHandlers.handleMouseDown}
                handleMouseMove={pointerEventHandlers.handleMouseMove}
                handleMouseUp={pointerEventHandlers.handleMouseUp}
                handleMouseEnter={pointerEventHandlers.handleMouseEnter}
                handlePointerDown={pointerEventHandlers.handlePointerDown}
                handlePointerMove={pointerEventHandlers.handlePointerMove}
                handlePointerUp={pointerEventHandlers.handlePointerUp}
                handlePointerCancel={pointerEventHandlers.handlePointerCancel}
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
            {((generationMode === "inpaint" && (displayImage || inputImage)) || generationMode === "img2img") && !isDrawing && (
                <div className={`absolute top-1 left-1 z-10 transition-opacity duration-200 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {generationMode === "inpaint" ? (
                        <InpaintToolbar
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
                collapsed={effectiveFooterCollapsed}
                onToggle={handleToggleFooter}
            />

            {/* Status Bar */}
            <StatusBar
                displayImage={displayImage || undefined}
                inputImage={inputImage || undefined}
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
