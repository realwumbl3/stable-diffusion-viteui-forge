import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize, Grid3X3, Upload, Minus, Plus } from "lucide-react";
import { cn } from "../lib/utils.js";
import PromptFooter from "./PromptFooter.jsx";
import InpaintToolbar from "./InpaintToolbar.jsx";

const InpaintCanvas = ({
    currentImage,
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
    inpaintMask,
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
}) => {
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(false);
    const [fitToScreen, setFitToScreen] = useState(true);
    const [footerCollapsed, setFooterCollapsed] = useState(false);
    const [showMask, setShowMask] = useState(true);
    const [showBorder, setShowBorder] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [brushSize, setBrushSize] = useState(initialBrushSize);
    const [drawingMode, setDrawingMode] = useState(initialDrawingMode);
    const [brushHardness, setBrushHardness] = useState(1.0); // 1.0 = 100% opacity/hardness
    const [isDragOver, setIsDragOver] = useState(false);
    const [lastDrawPos, setLastDrawPos] = useState(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode] = useState("edit");
    const [mouseButtonDown, setMouseButtonDown] = useState(false);
    const [drawingStartedOnCanvas, setDrawingStartedOnCanvas] = useState(false);
    const [isRightClickPanning, setIsRightClickPanning] = useState(false);
    const [rightClickStartPos, setRightClickStartPos] = useState({ x: 0, y: 0 });
    const [rightClickStartPan, setRightClickStartPan] = useState({ x: 0, y: 0 });

    // Undo/Redo system
    const [maskHistory, setMaskHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const borderCanvasRef = useRef(null);
    const imageRef = useRef(null);
    const fileInputRef = useRef(null);
    const panTargetRef = useRef(null);

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

        // Get available space (accounting for padding)
        const availableWidth = container.width - 64; // 32px padding on each side = 64px total
        const availableHeight = container.height - 64; // 32px padding on each side = 64px total

        // Calculate scale to fit the longest side
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);

        return scale;
    }, [getDisplayDimensions]);

    const calculateCenterOffset = useCallback((scale) => {
        // The flexbox centering works for vertical alignment, but horizontal might need adjustment
        // Try offsetting by the padding amount to compensate
        return { x: -32, y: 0 };
    }, []);

    // Auto-fit to screen when image changes
    useEffect(() => {
        if ((currentImage || inputImage || livePreview) && fitToScreen) {
            // Small delay to ensure image is loaded
            const timer = setTimeout(() => {
                const scale = calculateFitToScreenScale();
                setZoom(scale);
                setPanOffset(calculateCenterOffset(scale));
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [
        currentImage,
        inputImage,
        livePreview,
        generationWidth,
        generationHeight,
        fitToScreen,
        calculateFitToScreenScale,
        calculateCenterOffset,
    ]);

    useEffect(() => {
        if (currentImage) {
            setViewMode("result");
        } else if (inputImage) {
            setViewMode("edit");
        }
    }, [currentImage, inputImage]);

    // Initialize canvases when input image loads (not when result changes)
    useEffect(() => {
        if (inputImage && imageRef.current) {
            const img = imageRef.current;
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // Set canvas dimensions to match natural image dimensions
            if (maskCanvasRef.current) {
                maskCanvasRef.current.width = naturalWidth;
                maskCanvasRef.current.height = naturalHeight;
                // Clear canvas
                const ctx = maskCanvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, naturalWidth, naturalHeight);

                // Initialize history with empty state
                const emptyImageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                setMaskHistory([emptyImageData]);
                setHistoryIndex(0);
            }
            if (overlayCanvasRef.current) {
                overlayCanvasRef.current.width = naturalWidth;
                overlayCanvasRef.current.height = naturalHeight;
            }
            if (borderCanvasRef.current) {
                borderCanvasRef.current.width = naturalWidth;
                borderCanvasRef.current.height = naturalHeight;
            }
        }
    }, [inputImage]);

    const handleZoomIn = () => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.min(prev * zoomFactor, 5);
            setFitToScreen(false);

            // Zoom towards center of viewport for button zoom
            const zoomRatio = newZoom / prev;
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
    };

    const handleZoomOut = () => {
        const zoomFactor = 1.2;
        setZoom((prev) => {
            const newZoom = Math.max(prev / zoomFactor, 0.1);
            setFitToScreen(false);

            // Zoom towards center of viewport for button zoom
            const zoomRatio = newZoom / prev;
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
    };

    const handleResetZoom = () => {
        setZoom(1);
        setPanOffset(calculateCenterOffset(1));
        setFitToScreen(true);
    };

    const handleFitToScreen = () => {
        if (!canvasRef.current || !imageRef.current) return;

        const scale = calculateFitToScreenScale();
        setZoom(scale);
        setPanOffset(calculateCenterOffset(scale));
        setFitToScreen(true);
    };

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

        // Handle mouse up at document level to ensure drawing stops even when released outside canvas
        const handleDocumentMouseUp = () => {
            // Right-click panning is handled by capture phase listener

            if (isDrawing) {
                setIsDrawing(false);
                setLastDrawPos(null); // Clear last position when done drawing
                setMouseButtonDown(false);
                setDrawingStartedOnCanvas(false);
                // Export mask as base64
                const maskDataURL = getMaskDataUrl();
                if (maskDataURL) {
                    setInpaintMask(maskDataURL);
                }
                saveMaskState();
                updateBorderVisualization();
            }
        };

        const handleDocumentMouseDown = (e) => {
            setMouseButtonDown(e.button === 0); // Left mouse button
        };

        document.addEventListener("pointerlockchange", handlePointerLockChange);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mousedown", handleDocumentMouseDown);
        document.addEventListener("mouseup", handleDocumentMouseUp);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("pointerlockchange", handlePointerLockChange);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mousedown", handleDocumentMouseDown);
            document.removeEventListener("mouseup", handleDocumentMouseUp);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [isDrawing, isRightClickPanning]);

    const startPan = (e) => {
        if (!panTargetRef.current) return;
        e.preventDefault();
        panTargetRef.current.requestPointerLock();
    };

    const stopPan = () => {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    };

    // Add non-passive wheel event listener for zoom functionality
    useEffect(() => {
        const canvasElement = canvasRef.current;
        const canvasContainer = canvasRef.current?.firstChild;

        if (!canvasElement) return;

        const handleWheelEvent = (e) => {
            const path = e.path || (e.composedPath && e.composedPath()) || [];
            const isInsideCanvas = path.some((item) => item === canvasContainer);
            if (!isInsideCanvas) return;

            if (!e.defaultPrevented) {
                e.preventDefault();
            }

            const zoomFactor = 1.1;
            const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

            // Get mouse position relative to the canvas container
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            setZoom((prev) => {
                const newZoom = Math.max(0.1, Math.min(5, prev * delta));
                setFitToScreen(false);

                // Adjust pan offset so zoom focuses on cursor position
                // The point under the cursor should remain at the same screen position
                const zoomRatio = newZoom / prev;

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

        canvasElement.addEventListener("wheel", handleWheelEvent);

        return () => {
            canvasElement.removeEventListener("wheel", handleWheelEvent);
        };
    }, [panOffset.x, panOffset.y]);

    // Capture phase event listeners for right-click panning (to work around browser extensions)
    useEffect(() => {
        const canvasElement = panTargetRef.current;
        if (!canvasElement) return;

        const handleRightClickDown = (e) => {
            if (e.button === 2 && inputImage) {
                e.preventDefault();
                e.stopPropagation();
                setIsRightClickPanning(true);
                setRightClickStartPos({ x: e.clientX, y: e.clientY });
                setRightClickStartPan({ ...panOffset });
            }
        };

        const handleRightClickMove = (e) => {
            if (isRightClickPanning) {
                e.preventDefault();
                e.stopPropagation();
                const deltaX = e.clientX - rightClickStartPos.x;
                const deltaY = e.clientY - rightClickStartPos.y;
                setPanOffset({
                    x: rightClickStartPan.x + deltaX,
                    y: rightClickStartPan.y + deltaY,
                });
            }
        };

        const handleRightClickUp = (e) => {
            if (isRightClickPanning) {
                e.preventDefault();
                e.stopPropagation();
                setIsRightClickPanning(false);
            }
        };

        // Add capture phase listeners (third parameter true = capture phase)
        canvasElement.addEventListener("mousedown", handleRightClickDown, true);
        canvasElement.addEventListener("mousemove", handleRightClickMove, true);
        canvasElement.addEventListener("mouseup", handleRightClickUp, true);

        return () => {
            canvasElement.removeEventListener("mousedown", handleRightClickDown, true);
            canvasElement.removeEventListener("mousemove", handleRightClickMove, true);
            canvasElement.removeEventListener("mouseup", handleRightClickUp, true);
        };
    }, [inputImage, isRightClickPanning, panOffset, rightClickStartPos, rightClickStartPan]);

    // File handling functions
    const handleFileSelect = useCallback(
        (file) => {
            if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (onImageUpload) {
                        onImageUpload(e.target.result);
                        // Clear any existing mask when uploading a new image
                        setInpaintMask(null);
                        // Reset history for new image
                        setMaskHistory([]);
                        setHistoryIndex(-1);
                    }
                };
                reader.readAsDataURL(file);
            }
        },
        [onImageUpload]
    );

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    // Drag and drop handlers
    const handleDragOver = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDrawing) {
                setIsDragOver(true);
            }
        },
        [isDrawing]
    );

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    // Drawing functions
    const getCanvasCoordinates = (e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();

        // Calculate coordinates relative to the actual image dimensions
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        console.log("Coords:", x, y, "Scale:", scaleX, scaleY);

        return { x, y };
    };

    const drawBrushPoint = (x, y) => {
        if (!maskCanvasRef.current) return;

        const ctx = maskCanvasRef.current.getContext("2d");
        ctx.globalCompositeOperation = drawingMode === "erase" ? "destination-out" : "source-over";
        ctx.fillStyle = `rgba(255, 0, 0, ${brushHardness})`;

        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    };

    const drawBrushLine = (fromX, fromY, toX, toY) => {
        if (!maskCanvasRef.current) return;

        const ctx = maskCanvasRef.current.getContext("2d");
        ctx.globalCompositeOperation = drawingMode === "erase" ? "destination-out" : "source-over";
        ctx.strokeStyle = `rgba(255, 0, 0, ${brushHardness})`;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    };

    const drawBrush = (x, y) => {
        console.log("Drawing at:", x, y, "Mode:", drawingMode, "Size:", brushSize);

        if (lastDrawPos) {
            // Draw a line from last position to current position
            drawBrushLine(lastDrawPos.x, lastDrawPos.y, x, y);
        } else {
            // First point, draw a circle
            drawBrushPoint(x, y);
        }

        // Update last position
        setLastDrawPos({ x, y });
    };

    const getMaskDataUrl = () => {
        if (!maskCanvasRef.current) return null;

        const sourceCanvas = maskCanvasRef.current;
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = sourceCanvas.width;
        exportCanvas.height = sourceCanvas.height;

        const exportCtx = exportCanvas.getContext("2d");
        exportCtx.drawImage(sourceCanvas, 0, 0);

        const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const { data } = imageData;

        // Normalize to fully opaque black/white mask for backend
        for (let i = 3; i < data.length; i += 4) {
            const alpha = data[i];
            const isMasked = alpha > 0;
            const value = isMasked ? 255 : 0;
            data[i - 3] = value;
            data[i - 2] = value;
            data[i - 1] = value;
            data[i] = 255;
        }

        exportCtx.putImageData(imageData, 0, 0);
        return exportCanvas.toDataURL("image/png");
    };

    // Calculate bounding box of mask pixels for padding visualization
    const getMaskBounds = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        const canvas = maskCanvasRef.current;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        let hasMask = false;

        // Find bounds of masked pixels (alpha > 0)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];

                if (alpha > 0) {
                    hasMask = true;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasMask) return null;

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        };
    }, []);

    const handleMouseDown = (e) => {
        if (!inputImage) return;

        // Right-click is handled by capture phase listener, skip here

        // Only trigger drawing if clicking directly on the image or canvas elements
        const target = e.target;
        const isValidTarget = target.tagName === "IMG" || target.tagName === "CANVAS";
        if (!isValidTarget) return;

        if (e.shiftKey) {
            startPan(e);
            return;
        }

        console.log("Mouse down on valid target");
        setIsDrawing(true);
        setMouseButtonDown(true);
        setDrawingStartedOnCanvas(true);
        const { x, y } = getCanvasCoordinates(e);
        setLastDrawPos(null); // Reset last position for new stroke
        drawBrush(x, y);
    };

    const handleMouseMove = (e) => {
        // Right-click panning is handled by capture phase listener, skip here

        if (!isDrawing) return;

        // Only continue drawing if moving over valid targets
        const target = e.target;
        const isValidTarget = target.tagName === "IMG" || target.tagName === "CANVAS";
        if (!isValidTarget) return;

        const { x, y } = getCanvasCoordinates(e);
        drawBrush(x, y);
    };

    const handleMouseEnter = (e) => {
        // Resume drawing only if mouse button is held down, we're not currently drawing,
        // drawing was started on canvas, and we're entering over a valid target
        if (mouseButtonDown && !isDrawing && drawingStartedOnCanvas && inputImage) {
            // Only resume if entering over a valid target
            const target = e.target;
            const isValidTarget = target.tagName === "IMG" || target.tagName === "CANVAS";
            if (!isValidTarget) return;

            console.log("Resuming drawing on mouse enter");
            setIsDrawing(true);
            const { x, y } = getCanvasCoordinates(e);
            setLastDrawPos(null); // Reset last position for new stroke
            drawBrush(x, y);
        }
    };

    const handleMouseUp = () => {
        // Right-click panning is handled by capture phase listener, skip here

        if (isPanning || document.pointerLockElement === panTargetRef.current) {
            stopPan();
            return;
        }

        // Drawing logic now handled at document level in useEffect
    };

    const clearMask = () => {
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            setInpaintMask(null);
            saveMaskState();
            updateBorderVisualization();
        }
    };

    const fillMask = () => {
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext("2d");
            ctx.fillStyle = "rgba(255, 0, 0, 1.0)"; // Full opacity for fill
            ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            const maskDataURL = getMaskDataUrl();
            if (maskDataURL) {
                setInpaintMask(maskDataURL);
            }
            saveMaskState();
            updateBorderVisualization();
        }
    };

    const togglePreviewMode = () => {
        setViewMode((prev) => (prev === "edit" ? "result" : "edit"));
    };

    // Undo/Redo functions
    const saveMaskState = useCallback(() => {
        if (!maskCanvasRef.current) return;

        const canvas = maskCanvasRef.current;
        const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);

        setMaskHistory((prev) => {
            // Remove any history after current index (for when user drew after undoing)
            const newHistory = prev.slice(0, historyIndex + 1);
            // Add current state
            newHistory.push(imageData);
            // Limit history to 50 states to prevent memory issues
            if (newHistory.length > 50) {
                newHistory.shift();
                setHistoryIndex(newHistory.length - 1);
                return newHistory;
            }
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    }, [historyIndex]);

    const updateBorderVisualization = useCallback(() => {
        if (!borderCanvasRef.current || !inpaintFullRes || inpaintFullResPadding <= 0) {
            if (borderCanvasRef.current) {
                const ctx = borderCanvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, borderCanvasRef.current.width, borderCanvasRef.current.height);
            }
            return;
        }

        const canvas = borderCanvasRef.current;
        const ctx = canvas.getContext("2d");

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get mask bounds
        const bounds = getMaskBounds();
        if (!bounds) return;

        // Calculate padded bounds
        const paddedX = Math.max(0, bounds.x - inpaintFullResPadding);
        const paddedY = Math.max(0, bounds.y - inpaintFullResPadding);
        const paddedWidth = Math.min(canvas.width - paddedX, bounds.width + inpaintFullResPadding * 2);
        const paddedHeight = Math.min(canvas.height - paddedY, bounds.height + inpaintFullResPadding * 2);

        // Draw border box
        ctx.strokeStyle = "#10b981"; // Green color for padding visualization
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Dashed line
        ctx.strokeRect(paddedX, paddedY, paddedWidth, paddedHeight);

        // Draw inner solid box for the actual mask area
        ctx.strokeStyle = "#ef4444"; // Red color for mask area
        ctx.lineWidth = 1;
        ctx.setLineDash([]); // Solid line
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }, [inpaintFullRes, inpaintFullResPadding, getMaskBounds]);

    const undoMask = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);

            const canvas = maskCanvasRef.current;
            if (canvas && maskHistory[newIndex]) {
                const ctx = canvas.getContext("2d");
                ctx.putImageData(maskHistory[newIndex], 0, 0);

                // Update inpaint mask
                const maskDataURL = getMaskDataUrl();
                setInpaintMask(maskDataURL || null);
                updateBorderVisualization();
            }
        }
    }, [historyIndex, maskHistory, updateBorderVisualization]);

    const redoMask = useCallback(() => {
        if (historyIndex < maskHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);

            const canvas = maskCanvasRef.current;
            if (canvas && maskHistory[newIndex]) {
                const ctx = canvas.getContext("2d");
                ctx.putImageData(maskHistory[newIndex], 0, 0);

                // Update inpaint mask
                const maskDataURL = getMaskDataUrl();
                setInpaintMask(maskDataURL || null);
                updateBorderVisualization();
            }
        }
    }, [historyIndex, maskHistory, updateBorderVisualization]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < maskHistory.length - 1;

    // Keyboard shortcuts for drawing tools
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case "z":
                        if (e.shiftKey) {
                            e.preventDefault();
                            redoMask();
                        } else {
                            e.preventDefault();
                            undoMask();
                        }
                        break;
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case "b":
                    setDrawingMode("brush");
                    break;
                case "e":
                    setDrawingMode("erase");
                    break;
                case "f":
                    fillMask();
                    break;
                case "c":
                    clearMask();
                    break;
                case "[":
                    setBrushSize(Math.max(4, brushSize - 4));
                    break;
                case "]":
                    setBrushSize(brushSize + 4);
                    break;
                case "o":
                    setBrushHardness(Math.max(0.1, brushHardness - 0.1));
                    break;
                case "p":
                    setBrushHardness(Math.min(1.0, brushHardness + 0.1));
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [brushSize, undoMask, redoMask]);

    // Update border visualization

    // Draw padding border visualization
    useEffect(() => {
        updateBorderVisualization();
    }, [updateBorderVisualization]);

    const previewSrc = viewMode === "edit" ? currentImage : inpaintMask || inputImage;
    const previewLabel = viewMode === "edit" ? "View result" : "Back to mask";

    const mainImageSrc = viewMode === "edit" ? livePreview || inputImage || currentImage : currentImage || inputImage;

    return (
        <main className="studio-canvas relative flex flex-col min-h-0">
            {/* Left Toolbar - Mask Controls */}
            {(currentImage || inputImage) && !isDrawing && (
                <div className="absolute top-4 left-4 z-10">
                    {/* Inpainting Toolbar */}
                    <InpaintToolbar
                        drawingMode={drawingMode}
                        setDrawingMode={setDrawingMode}
                        brushSize={brushSize}
                        setBrushSize={setBrushSize}
                        brushHardness={brushHardness}
                        setBrushHardness={setBrushHardness}
                        zoom={zoom}
                        showMask={showMask}
                        setShowMask={setShowMask}
                        showBorder={showBorder}
                        setShowBorder={setShowBorder}
                        inpaintFullRes={inpaintFullRes}
                        inpaintFullResPadding={inpaintFullResPadding}
                        setInpaintFullResPadding={setInpaintFullResPadding}
                        onClear={clearMask}
                        onFill={fillMask}
                        onUndo={undoMask}
                        onRedo={redoMask}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        previewSrc={previewSrc}
                        previewLabel={previewLabel}
                        onTogglePreview={togglePreviewMode}
                    />
                </div>
            )}

            {/* Right Toolbar - Image Controls */}
            {(currentImage || inputImage) && !isDrawing && (
                <div className="absolute top-4 right-4 z-10">
                    <div className="studio-panel p-2">
                        <div className="flex gap-1">
                            <button onClick={handleZoomOut} className="studio-btn-ghost p-2" title="Zoom Out">
                                <ZoomOut size={16} />
                            </button>
                            <button
                                onClick={handleResetZoom}
                                className="studio-btn-ghost px-3 py-2 text-xs font-mono min-w-[60px]"
                                title="Reset Zoom"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button onClick={handleZoomIn} className="studio-btn-ghost p-2" title="Zoom In">
                                <ZoomIn size={16} />
                            </button>
                            <div className="w-px h-6 bg-studio-border mx-1" />
                            <button
                                onClick={handleFitToScreen}
                                className={cn("studio-btn-ghost p-2", fitToScreen && "text-studio-accent")}
                                title="Fit to Screen"
                            >
                                <Maximize size={16} />
                            </button>
                            <button
                                onClick={() => setShowGrid(!showGrid)}
                                className={cn("studio-btn-ghost p-2", showGrid && "text-studio-accent")}
                                title="Toggle Grid"
                            >
                                <Grid3X3 size={16} />
                            </button>
                            <div className="w-px h-6 bg-studio-border mx-1" />
                            <button onClick={openFileDialog} className="studio-btn-ghost p-2" title="Upload Image">
                                <Upload size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Canvas Area */}
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
                                : isDrawing
                                ? "crosshair"
                                : isDragOver
                                ? "copy"
                                : "default",
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Loading State - Show when generating */}
                    {loading && !currentImage && !inputImage ? (
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
                    ) : currentImage || inputImage ? (
                        /* Image Display with Mask Overlay */
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

                            {/* Loading Overlay */}
                            {loading && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                    <div className="text-center">
                                        {progress ? (
                                            <>
                                                <div className="w-8 h-8 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                <p className="text-studio-text text-sm mb-2">
                                                    {progress.textinfo || "Generating..."}
                                                </p>
                                                <div className="w-32 h-2 bg-studio-bg/30 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-studio-accent transition-all duration-300 ease-out"
                                                        style={{ width: `${progress.progress * 100}%` }}
                                                    />
                                                </div>
                                                <p className="text-studio-textSecondary text-xs mt-1">
                                                    {Math.round(progress.progress * 100)}%
                                                    {progress.total_batches > 1 &&
                                                        ` • ${progress.current_batch}/${progress.total_batches}`}
                                                    {progress.eta && ` • ETA: ${Math.round(progress.eta)}s`}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 border-3 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                <p className="text-studio-text text-sm">Regenerating...</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Empty State */
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
                            <h3 className="text-lg font-medium mb-2">Ready to Inpaint</h3>
                            <p className="text-sm">Upload an image and start drawing your mask</p>
                        </div>
                    )}

                    {/* Bottom Right Brush Settings */}
                    {(currentImage || inputImage) && !isDrawing && (
                        <div className="absolute bottom-4 right-4 z-10">
                            <div className="studio-panel p-2">
                                <div className="flex flex-col gap-2">
                                    {/* Brush Preview */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className="flex items-center justify-center w-full aspect-square bg-studio-surface rounded-lg border border-studio-border cursor-pointer"
                                            onWheel={(e) => {
                                                e.preventDefault();
                                                if (e.deltaY > 0) {
                                                    setBrushSize(Math.max(4, brushSize - 4));
                                                } else {
                                                    setBrushSize(brushSize + 4);
                                                }
                                            }}
                                            title="Scroll to change brush size"
                                        >
                                            <div
                                                className="bg-red-500 rounded-full transition-all duration-100"
                                                style={{
                                                    width: `${brushSize * zoom}px`,
                                                    height: `${brushSize * zoom}px`,
                                                    minWidth: "4px",
                                                    minHeight: "4px",
                                                    opacity: brushHardness,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-studio-textSecondary">Preview</span>
                                    </div>

                                    {/* Brush Size Control */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setBrushSize(Math.max(4, brushSize - 4))}
                                                className="studio-btn-ghost p-1"
                                                title="Decrease Brush Size ([)"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <div className="flex items-center px-2 py-1 bg-studio-surface rounded border border-studio-border min-w-[50px] justify-center">
                                                <span className="text-xs font-medium text-studio-text">
                                                    {brushSize}px
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setBrushSize(brushSize + 4)}
                                                className="studio-btn-ghost p-1"
                                                title="Increase Brush Size (])"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <span className="text-xs text-studio-textSecondary">Size</span>
                                    </div>

                                    {/* Brush Hardness Control */}
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1.0"
                                            step="0.1"
                                            value={brushHardness}
                                            onChange={(e) => setBrushHardness(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-studio-surface rounded-lg appearance-none cursor-pointer slider"
                                            title={`Brush Hardness: ${Math.round(brushHardness * 100)}% (O/P)`}
                                        />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-studio-textSecondary">Hardness</span>
                                            <span className="text-xs text-studio-textSecondary">
                                                {Math.round(brushHardness * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Prompt Footer */}
            <PromptFooter
                prompt={prompt}
                setPrompt={setPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                collapsed={footerCollapsed}
                onToggle={() => setFooterCollapsed(!footerCollapsed)}
            />

            {/* Status Bar */}
            <div className="studio-toolbar justify-between text-xs text-studio-textSecondary">
                <div className="flex items-center gap-4">
                    <span>Inpaint Canvas</span>
                    {(currentImage || inputImage) && (
                        <>
                            <span>•</span>
                            <span>{zoom !== 1 ? `${Math.round(zoom * 100)}%` : "Fit to screen"}</span>
                            {inputImage && (
                                <>
                                    <span>•</span>
                                    <span>Brush: {brushSize}px</span>
                                    <span>•</span>
                                    <span>Hardness: {Math.round(brushHardness * 100)}%</span>
                                    <span>•</span>
                                    <span>Mode: {drawingMode}</span>
                                </>
                            )}
                        </>
                    )}
                    {progress && loading && (
                        <>
                            <span>•</span>
                            <span>
                                Step {progress.sampling_step || 0}/{progress.sampling_steps || 0}
                            </span>
                            {progress.total_batches > 1 && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Batch {progress.current_batch}/{progress.total_batches}
                                    </span>
                                </>
                            )}
                            <span>•</span>
                            <span>{Math.round(progress.progress * 100)}%</span>
                            {progress.eta && (
                                <>
                                    <span>•</span>
                                    <span>ETA: {Math.round(progress.eta)}s</span>
                                </>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span>Stable Diffusion WebUI</span>
                    {progress && loading && <span className="text-studio-accent">{progress.textinfo}</span>}
                </div>
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
        </main>
    );
};

export default InpaintCanvas;
