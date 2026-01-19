import { useState, useEffect, useRef, useCallback } from "react";

interface UseCanvasStateProps {
    displayImage: string | null;
    inputImage: string | null;
    livePreview: boolean;
    generationWidth: number | null;
    generationHeight: number | null;
    forceEditMode: boolean;
    previewImage: string | null;
    canvasRef: React.RefObject<HTMLDivElement>;
    imageRef: React.RefObject<HTMLImageElement>;
    panTargetRef: React.RefObject<HTMLDivElement>;
    canvasPadding?: number;
    fitToScreenPadding?: number;
}

export function useCanvasState(props: UseCanvasStateProps) {
    const {
        displayImage,
        inputImage,
        livePreview,
        generationWidth,
        generationHeight,
        forceEditMode,
        previewImage,
        canvasRef,
        imageRef,
        panTargetRef,
        fitToScreenPadding = 16
    } = props;
    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(false);
    const [fitToScreen, setFitToScreen] = useState(true);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [lastDrawPos, setLastDrawPos] = useState(null);
    const [viewMode, setViewMode] = useState("edit");
    const [mouseButtonDown, setMouseButtonDown] = useState(false);
    const [drawingStartedOnCanvas, setDrawingStartedOnCanvas] = useState(false);
    const [isRightClickPanning, setIsRightClickPanning] = useState(false);
    const [rightClickStartPos, setRightClickStartPos] = useState({ x: 0, y: 0 });
    const [rightClickStartPan, setRightClickStartPan] = useState({ x: 0, y: 0 });

    // Mask visibility state
    const [showMask, setShowMask] = useState(true);
    const [showBorder, setShowBorder] = useState(true);
    const [lastMaskVisibility, setLastMaskVisibility] = useState(true);
    const [hasRememberedMaskSetting, setHasRememberedMaskSetting] = useState(false);

    // Footer state
    const [footerCollapsed, setFooterCollapsed] = useState(false);

    // Utility functions
    const getDisplayDimensions = useCallback(() => {
        if (!imageRef.current) {
            return { width: 1, height: 1 };
        }

        if (livePreview && generationWidth && generationHeight) {
            return { width: generationWidth, height: generationHeight };
        }

        return {
            width: imageRef.current.naturalWidth || 1,
            height: imageRef.current.naturalHeight || 1,
        };
    }, [livePreview, generationWidth, generationHeight]);

    const calculateFitToScreenScale = useCallback(() => {
        if (!canvasRef.current || !imageRef.current) return 1;

        const container = canvasRef.current.getBoundingClientRect();
        const { width: imageWidth, height: imageHeight } = getDisplayDimensions();

        // Get available space (accounting for fit-to-screen padding)
        const availableWidth = container.width - fitToScreenPadding;
        const availableHeight = container.height - fitToScreenPadding;

        // Calculate scale to fit the longest side
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);

        return scale;
    }, [getDisplayDimensions, fitToScreenPadding]);

    const calculateCenterOffset = useCallback((scale) => {
        // The flexbox centering works for vertical alignment, but horizontal might need adjustment
        // Try offsetting by half the fit-to-screen padding amount to compensate
        return { x: -(fitToScreenPadding / 2), y: 0 };
    }, [fitToScreenPadding]);

    // Auto-fit to screen when image changes
    useEffect(() => {
        if ((displayImage || inputImage || livePreview) && fitToScreen) {
            // Small delay to ensure image is loaded
            const timer = setTimeout(() => {
                const scale = calculateFitToScreenScale();
                setZoom(scale);
                setPanOffset(calculateCenterOffset(scale));
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [
        displayImage,
        inputImage,
        livePreview,
        generationWidth,
        generationHeight,
        fitToScreen,
        calculateFitToScreenScale,
        calculateCenterOffset,
    ]);

    // Update view mode based on available images
    useEffect(() => {
        if (forceEditMode) {
            setViewMode("edit");
        } else if (displayImage) {
            setViewMode("result");
        } else if (inputImage) {
            setViewMode("edit");
        }
    }, [displayImage, inputImage, forceEditMode]);

    // Manage mask visibility during preview mode
    useEffect(() => {
        if (previewImage) {
            // When first entering preview mode, remember the canvas mask setting
            if (!hasRememberedMaskSetting) {
                setLastMaskVisibility(showMask);
                setHasRememberedMaskSetting(true);
            }
            // Always hide mask in preview mode
            setShowMask(false);
        } else {
            // When returning to canvas mode, restore the remembered mask setting
            setShowMask(lastMaskVisibility);
            setHasRememberedMaskSetting(false);
        }
    }, [previewImage]); // Remove showMask from dependencies to avoid cycles

    // Zoom functions
    const handleZoomIn = useCallback(() => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.min(prev * zoomFactor, 5);
            setFitToScreen(false);

            // Zoom towards center of viewport for button zoom
            const centerX = 0; // Center of viewport (relative to canvas center)
            const centerY = 0;

            // Calculate the position in the untransformed coordinate system
            const imageX = (centerX - panOffset.x) / prev;
            const imageY = (centerY - panOffset.y) / prev;

            // Calculate new pan offset so the center point stays centered
            const newPanX = centerX - imageX * newZoom;
            const newPanY = centerY - imageY * newZoom;

            setPanOffset({
                x: newPanX,
                y: newPanY,
            });

            return newZoom;
        });
    }, [panOffset.x, panOffset.y]);

    const handleZoomOut = useCallback(() => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.max(prev / zoomFactor, 0.1);
            setFitToScreen(false);

            // Zoom towards center of viewport for button zoom
            const centerX = 0; // Center of viewport (relative to canvas center)
            const centerY = 0;

            // Calculate the position in the untransformed coordinate system
            const imageX = (centerX - panOffset.x) / prev;
            const imageY = (centerY - panOffset.y) / prev;

            // Calculate new pan offset so the center point stays centered
            const newPanX = centerX - imageX * newZoom;
            const newPanY = centerY - imageY * newZoom;

            setPanOffset({
                x: newPanX,
                y: newPanY,
            });

            return newZoom;
        });
    }, [panOffset.x, panOffset.y]);

    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setPanOffset(calculateCenterOffset(1));
        setFitToScreen(true);
    }, [calculateCenterOffset]);

    const handleFitToScreen = useCallback(() => {
        if (!canvasRef.current || !imageRef.current) return;

        const scale = calculateFitToScreenScale();
        setZoom(scale);
        setPanOffset(calculateCenterOffset(scale));
        setFitToScreen(true);
    }, [calculateFitToScreenScale, calculateCenterOffset]);

    // Pan functions
    const startPan = useCallback((e) => {
        if (!panTargetRef.current) return;
        e.preventDefault();
        panTargetRef.current.requestPointerLock();
    }, []);

    const stopPan = useCallback(() => {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, []);

    // Custom mask setter that preserves setting when in canvas mode
    const setMaskVisibility = useCallback((newVisibility) => {
        setShowMask(newVisibility);
        // Only update remembered setting when not in preview mode
        if (!previewImage) {
            setLastMaskVisibility(newVisibility);
            // Reset the flag so next preview session will remember this new setting
            setHasRememberedMaskSetting(false);
        }
    }, [previewImage]);

    // Toggle preview mode
    const togglePreviewMode = useCallback(() => {
        setViewMode((prev) => (prev === "edit" ? "result" : "edit"));
    }, []);

    // Mouse and pointer lock event handlers
    useEffect(() => {
        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === panTargetRef.current;
            setIsPanning(locked);
        };

        const handleMouseMove = (e) => {
            if (document.pointerLockElement !== panTargetRef.current) return;
            setPanOffset((prev) => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY,
            }));
        };

        const handleKeyUp = (e) => {
            if (e.key === "Shift" && document.pointerLockElement) {
                document.exitPointerLock();
            }
        };

        document.addEventListener("pointerlockchange", handlePointerLockChange);
        document.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("pointerlockchange", handlePointerLockChange);
            document.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return {
        // State
        zoom,
        setZoom,
        showGrid,
        setShowGrid,
        fitToScreen,
        setFitToScreen,
        panOffset,
        setPanOffset,
        isDrawing,
        setIsDrawing,
        isPanning,
        lastDrawPos,
        setLastDrawPos,
        viewMode,
        setViewMode,
        mouseButtonDown,
        setMouseButtonDown,
        drawingStartedOnCanvas,
        setDrawingStartedOnCanvas,
        isRightClickPanning,
        setIsRightClickPanning,
        rightClickStartPos,
        setRightClickStartPos,
        rightClickStartPan,
        setRightClickStartPan,
        showMask,
        showBorder,
        setShowBorder,
        lastMaskVisibility,
        hasRememberedMaskSetting,
        footerCollapsed,
        setFooterCollapsed,

        // Functions
        getDisplayDimensions,
        calculateFitToScreenScale,
        calculateCenterOffset,
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        handleFitToScreen,
        startPan,
        stopPan,
        setMaskVisibility,
        togglePreviewMode,
    };
}