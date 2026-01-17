import { useState, useRef, useCallback, useEffect } from "react";

export function useDrawing({
    inputImage,
    setInpaintMask,
    inpaintFullRes,
    inpaintFullResPadding,
    imageRef,
    maskCanvasRef,
    borderCanvasRef,
    brushSize,
    drawingMode,
    brushHardness,
}) {
    // Undo/Redo system
    const [maskHistory, setMaskHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initialize canvases when input image loads (not when result changes)
    useEffect(() => {
        if (inputImage && imageRef.current) {
            const img = imageRef.current;
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // Ensure we have valid dimensions
            if (naturalWidth > 0 && naturalHeight > 0) {
                // Set canvas dimensions to match natural image dimensions
                if (maskCanvasRef.current) {
                    maskCanvasRef.current.width = naturalWidth;
                    maskCanvasRef.current.height = naturalHeight;

                    // Clear canvas only if not preserving mask
                    const ctx = maskCanvasRef.current.getContext("2d");
                    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

                    // Initialize history with empty state
                    const emptyImageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                    setMaskHistory([emptyImageData]);
                    setHistoryIndex(0);
                    // If preserving mask, keep existing canvas content and history
                }
                if (borderCanvasRef.current) {
                    borderCanvasRef.current.width = naturalWidth;
                    borderCanvasRef.current.height = naturalHeight;
                }
            }
        }
    }, [inputImage]);

    // Drawing functions
    const getCanvasCoordinates = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();

        // Calculate coordinates relative to the actual image dimensions
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return { x, y };
    }, []);

    const drawBrushPoint = useCallback((x, y) => {
        if (!maskCanvasRef.current) return;

        const ctx = maskCanvasRef.current.getContext("2d");
        ctx.globalCompositeOperation = drawingMode === "erase" ? "destination-out" : "source-over";
        ctx.fillStyle = `rgba(255, 0, 0, ${brushHardness})`;

        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    }, [drawingMode, brushHardness, brushSize]);

    const drawBrushLine = useCallback((fromX, fromY, toX, toY) => {
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
    }, [drawingMode, brushHardness, brushSize]);

    const drawBrush = useCallback((x, y, lastDrawPos) => {
        if (lastDrawPos) {
            // Draw a line from last position to current position
            drawBrushLine(lastDrawPos.x, lastDrawPos.y, x, y);
        } else {
            // First point, draw a circle
            drawBrushPoint(x, y);
        }
    }, [drawBrushLine, drawBrushPoint]);

    const getMaskDataUrl = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        const sourceCanvas = maskCanvasRef.current;
        if (sourceCanvas.width === 0 || sourceCanvas.height === 0) return null;

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
    }, []);

    // Calculate bounding box of mask pixels for padding visualization
    const getMaskBounds = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return null;

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

    const clearMask = useCallback(() => {
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            setInpaintMask(null);
            saveMaskState();
            updateBorderVisualization();
        }
    }, [setInpaintMask]);

    const fillMask = useCallback(() => {
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
    }, [setInpaintMask, getMaskDataUrl]);

    // Undo/Redo functions
    const saveMaskState = useCallback(() => {
        if (!maskCanvasRef.current) return;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return;

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

    // Update border visualization
    useEffect(() => {
        updateBorderVisualization();
    }, [updateBorderVisualization]);

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
    }, [historyIndex, maskHistory, getMaskDataUrl, setInpaintMask, updateBorderVisualization]);

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
    }, [historyIndex, maskHistory, getMaskDataUrl, setInpaintMask, updateBorderVisualization]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < maskHistory.length - 1;

    return {
        // Functions
        getCanvasCoordinates,
        drawBrush,
        getMaskDataUrl,
        clearMask,
        fillMask,
        saveMaskState,
        undoMask,
        redoMask,
        canUndo,
        canRedo,
    };
}