import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";

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
    fitToScreenPadding?: number;
}

type ViewMode = "edit" | "result";

interface MaskState {
    showMask: boolean;
    lastMaskVisibility: boolean;
    hasRememberedMaskSetting: boolean;
}

type MaskAction =
    | { type: "SET_VISIBILITY"; visible: boolean; inPreview: boolean }
    | { type: "ENTER_PREVIEW" }
    | { type: "EXIT_PREVIEW" };

const initialMaskState: MaskState = {
    showMask: true,
    lastMaskVisibility: true,
    hasRememberedMaskSetting: false,
};

function maskReducer(state: MaskState, action: MaskAction): MaskState {
    switch (action.type) {
        case "SET_VISIBILITY":
            if (!action.inPreview) {
                return {
                    showMask: action.visible,
                    lastMaskVisibility: action.visible,
                    hasRememberedMaskSetting: false,
                };
            }
            return {
                ...state,
                showMask: action.visible,
            };
        case "ENTER_PREVIEW":
            if (state.hasRememberedMaskSetting) {
                return {
                    ...state,
                    showMask: false,
                };
            }
            return {
                showMask: false,
                lastMaskVisibility: state.showMask,
                hasRememberedMaskSetting: true,
            };
        case "EXIT_PREVIEW":
            return {
                showMask: state.lastMaskVisibility,
                lastMaskVisibility: state.lastMaskVisibility,
                hasRememberedMaskSetting: false,
            };
        default:
            return state;
    }
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
    const [panType, setPanType] = useState<'shift' | 'right-click' | null>(null); // 'shift' or 'right-click'
    const lastDrawPosRef = useRef<{ x: number; y: number } | null>(null);
    const [mouseButtonDown, setMouseButtonDown] = useState(false);
    const [drawingStartedOnCanvas, setDrawingStartedOnCanvas] = useState(false);
    const [isRightClickPanning, setIsRightClickPanning] = useState(false);
    const [rightClickStartPos, setRightClickStartPos] = useState({ x: 0, y: 0 });
    const [rightClickStartPan, setRightClickStartPan] = useState({ x: 0, y: 0 });

    const setLastDrawPos = useCallback((pos: { x: number; y: number } | null) => {
        lastDrawPosRef.current = pos;
    }, []);

    // Mask visibility state
    const [showBorder, setShowBorder] = useState(true);
    const [maskState, dispatchMaskState] = useReducer(maskReducer, initialMaskState);
    const { showMask } = maskState;
    const previewWasActiveRef = useRef<string | null>(null);
    const isPreviewActive = Boolean(previewImage);

    useEffect(() => {
        const wasPreviewActive = Boolean(previewWasActiveRef.current);
        if (isPreviewActive && !wasPreviewActive) {
            dispatchMaskState({ type: "ENTER_PREVIEW" });
        } else if (!isPreviewActive && wasPreviewActive) {
            dispatchMaskState({ type: "EXIT_PREVIEW" });
        }
        previewWasActiveRef.current = previewImage;
    }, [isPreviewActive, previewImage]);

    const viewMode = useMemo<ViewMode>(() => {
        if (forceEditMode || livePreview) {
            return "edit";
        }
        if (displayImage) {
            return "result";
        }
        if (inputImage) {
            return "edit";
        }
        return "edit";
    }, [forceEditMode, livePreview, displayImage, inputImage]);

    // Footer state
    const [footerCollapsed, setFooterCollapsed] = useState(false);

    // Utility functions
    const getDisplayDimensions = useCallback(() => {
        if (!imageRef.current) {
            return { width: 1, height: 1 };
        }

        // Always use input image dimensions for canvas sizing in edit mode
        // Live preview should be purely cosmetic and not affect canvas layout
        if (viewMode === "edit" && inputImage) {
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
    }, [viewMode, inputImage, livePreview, generationWidth, generationHeight, imageRef]);

    const calculateFitToScreenScale = useCallback(() => {
        if (!canvasRef.current || !imageRef.current) return 1;

        const container = canvasRef.current.getBoundingClientRect();
        const { width: imageWidth, height: imageHeight } = getDisplayDimensions();

        // Ensure we have valid image dimensions (minimum 1px to prevent division by zero)
        if (imageWidth <= 0 || imageHeight <= 0) return 1;

        // Get available space (accounting for fit-to-screen padding)
        const availableWidth = Math.max(container.width - fitToScreenPadding, 1);
        const availableHeight = Math.max(container.height - fitToScreenPadding, 1);

        // Calculate scale to fit the longest side
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);

        // Add bounds checking to prevent extreme zoom values
        // Minimum zoom: 0.01 (1%), Maximum zoom: 5.0 (500%)
        return Math.max(0.01, Math.min(scale, 5.0));
    }, [canvasRef, imageRef, getDisplayDimensions, fitToScreenPadding]);

    const calculateCenterOffset = useCallback(() => {
        // The flexbox centering works for vertical alignment, but horizontal might need adjustment
        // Try offsetting by half the fit-to-screen padding amount to compensate
        return { x: -(fitToScreenPadding / 2), y: 0 };
    }, [fitToScreenPadding]);

    // Auto-fit to screen when image changes
    useEffect(() => {
        // Only fit when the actual displayed image changes, not when livePreview appears as overlay
        const shouldFit = (displayImage || inputImage) && fitToScreen && !livePreview;
        if (shouldFit) {
            const attemptFitToScreen = () => {
                // Check if image is loaded and has valid dimensions
                if (!imageRef.current) return false;

                const img = imageRef.current;
                const { width: imageWidth, height: imageHeight } = getDisplayDimensions();

                // Ensure image is loaded and has valid dimensions
                if (!img.complete || imageWidth <= 0 || imageHeight <= 0) {
                    return false;
                }

                const scale = calculateFitToScreenScale();
                setZoom(scale);
                setPanOffset(calculateCenterOffset());
                return true;
            };

            // Try immediately first
            if (attemptFitToScreen()) return;

            // If image isn't loaded yet, wait for it to load
            const handleImageLoad = () => {
                attemptFitToScreen();
            };

            const img = imageRef.current;
            if (img && !img.complete) {
                img.addEventListener('load', handleImageLoad);
                return () => {
                    img.removeEventListener('load', handleImageLoad);
                };
            }

            // Fallback: try again after a short delay in case dimensions weren't ready
            const timer = setTimeout(() => {
                attemptFitToScreen();
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [
        displayImage,
        inputImage,
        generationWidth,
        generationHeight,
        fitToScreen,
        calculateFitToScreenScale,
        calculateCenterOffset,
        livePreview,
        getDisplayDimensions,
        imageRef,
    ]);

    // Zoom functions
    const handleZoomIn = useCallback(() => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.min(prev * zoomFactor, 5.0); // Cap at 500%
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
            const newZoom = Math.max(prev / zoomFactor, 0.01); // Minimum 1%
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

    // Pan functions
    const startPan = useCallback((e: React.MouseEvent) => {
        if (!panTargetRef.current) return;
        e.preventDefault();
        setPanType('shift');
        panTargetRef.current.requestPointerLock();
    }, [panTargetRef]);

    const stopPan = useCallback(() => {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, []);

    // Custom mask setter that preserves setting when in canvas mode
    const setMaskVisibility = useCallback((newVisibility: boolean) => {
        dispatchMaskState({
            type: "SET_VISIBILITY",
            visible: newVisibility,
            inPreview: isPreviewActive,
        });
    }, [isPreviewActive]);

    // Mouse and pointer lock event handlers
    useEffect(() => {
        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === panTargetRef.current;
            setIsPanning(locked);
            if (!locked) {
                setPanType(null);
                setIsRightClickPanning(false);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement !== panTargetRef.current) return;
            setPanOffset((prev) => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY,
            }));
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift" && document.pointerLockElement && panType === 'shift') {
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
    }, [panType, panTargetRef]);

    return useMemo(() => ({
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
        panType,
        setPanType,
        lastDrawPosRef,
        setLastDrawPos,
        viewMode,
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
    }), [
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
        panType,
        setPanType,
        // lastDrawPosRef is a ref, doesn't need to be in dependencies for correctness,
        // but setLastDrawPos is a stable callback now.
        setLastDrawPos,
        viewMode,
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
        footerCollapsed,
        setFooterCollapsed,
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
    ]);
}