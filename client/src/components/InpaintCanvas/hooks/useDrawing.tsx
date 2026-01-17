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
    fillTarget,
    fillTolerance,
    fillOverfill,
}) {
    // Undo/Redo system
    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initialize canvases when input image loads (not when result changes)
    useEffect(() => {
        if (!inputImage || !imageRef.current) return;

        const img = imageRef.current;

        const initializeCanvases = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // Ensure we have valid dimensions
            if (naturalWidth > 0 && naturalHeight > 0) {
                // Preserve existing mask pixels before resizing (resize clears canvas)
                let previousMaskCanvas: HTMLCanvasElement | null = null;
                if (maskCanvasRef.current && maskCanvasRef.current.width > 0 && maskCanvasRef.current.height > 0) {
                    previousMaskCanvas = document.createElement("canvas");
                    previousMaskCanvas.width = maskCanvasRef.current.width;
                    previousMaskCanvas.height = maskCanvasRef.current.height;
                    const prevCtx = previousMaskCanvas.getContext("2d");
                    if (prevCtx) {
                        prevCtx.drawImage(maskCanvasRef.current, 0, 0);
                    }
                }

                // Set canvas dimensions to match natural image dimensions
                if (maskCanvasRef.current) {
                    maskCanvasRef.current.width = naturalWidth;
                    maskCanvasRef.current.height = naturalHeight;

                    const ctx = maskCanvasRef.current.getContext("2d");
                    if (previousMaskCanvas && ctx) {
                        ctx.drawImage(previousMaskCanvas, 0, 0, naturalWidth, naturalHeight);
                        const imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                        setMaskHistory([imageData]);
                        setHistoryIndex(0);
                    } else if (ctx) {
                        // Initialize history with empty state (first-time setup)
                        const emptyImageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                        setMaskHistory([emptyImageData]);
                        setHistoryIndex(0);
                    }

                    // Mask is always preserved on image changes unless user clears it explicitly
                }
                if (borderCanvasRef.current) {
                    borderCanvasRef.current.width = naturalWidth;
                    borderCanvasRef.current.height = naturalHeight;
                }
            }
        };

        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            initializeCanvases();
            return;
        }

        img.addEventListener("load", initializeCanvases);
        return () => {
            img.removeEventListener("load", initializeCanvases);
        };
    }, [inputImage]);

    // Drawing functions
    const getCanvasCoordinates = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();

        // Calculate coordinates relative to the actual image dimensions
        // The image rect gives us the displayed position and size after transformation
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
        if (!maskCanvasRef.current) return;
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
        if (!exportCtx) return null;

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

    const clearMask = useCallback(() => {
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            setInpaintMask(null);
            saveMaskState();
        }
    }, [saveMaskState, setInpaintMask]);

    const fillAtPoint = useCallback((x, y) => {
        if (!maskCanvasRef.current || !imageRef.current) return;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return;

        const startX = Math.floor(x);
        const startY = Math.floor(y);
        if (startX < 0 || startY < 0 || startX >= canvas.width || startY >= canvas.height) return;

        const maskCtx = canvas.getContext("2d");
        const maskImageData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = maskImageData.data;

        let sourceData: Uint8ClampedArray | null = null;
        if (fillTarget !== "canvas") {
            const sourceCanvas = document.createElement("canvas");
            sourceCanvas.width = canvas.width;
            sourceCanvas.height = canvas.height;
            const sourceCtx = sourceCanvas.getContext("2d");
            if (!sourceCtx) return;

            sourceCtx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
            const sourceImageData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);
            sourceData = sourceImageData.data;
        }

        const startIndex = startY * canvas.width + startX;
        const startOffset = startIndex * 4;
        const targetMaskAlpha = maskData[startOffset + 3];
        const targetMaskFilled = targetMaskAlpha > 0;

        let targetR = 0;
        let targetG = 0;
        let targetB = 0;
        let targetA = 0;
        let source: Uint8ClampedArray | null = null;
        if (fillTarget !== "canvas") {
            if (!sourceData) return;
            source = sourceData;
            targetR = source[startOffset];
            targetG = source[startOffset + 1];
            targetB = source[startOffset + 2];
            targetA = source[startOffset + 3];
        }

        const colorTolerance = Math.max(0, Math.min(255, fillTolerance ?? 32));
        const visited = new Uint8Array(canvas.width * canvas.height);
        const newlyFilled = new Uint8Array(canvas.width * canvas.height);
        const stack = [startIndex];

        while (stack.length) {
            const index = stack.pop();
            if (index === undefined) continue;
            if (visited[index]) continue;
            visited[index] = 1;

            const offset = index * 4;
            const maskAlpha = maskData[offset + 3];
            const maskFilled = maskAlpha > 0;

            if (fillTarget === "canvas") {
                if (maskFilled !== targetMaskFilled) {
                    continue;
                }
            } else {
                if (!source) continue;
                const r = source[offset];
                const g = source[offset + 1];
                const b = source[offset + 2];
                const a = source[offset + 3];

                if (
                    Math.abs(r - targetR) > colorTolerance ||
                    Math.abs(g - targetG) > colorTolerance ||
                    Math.abs(b - targetB) > colorTolerance ||
                    Math.abs(a - targetA) > colorTolerance
                ) {
                    continue;
                }

                if (fillTarget === "both" && maskFilled !== targetMaskFilled) {
                    continue;
                }
            }

            maskData[offset] = 255;
            maskData[offset + 1] = 0;
            maskData[offset + 2] = 0;
            maskData[offset + 3] = 255;
            newlyFilled[index] = 1;

            const xPos = index % canvas.width;
            const yPos = Math.floor(index / canvas.width);

            if (xPos > 0) stack.push(index - 1);
            if (xPos < canvas.width - 1) stack.push(index + 1);
            if (yPos > 0) stack.push(index - canvas.width);
            if (yPos < canvas.height - 1) stack.push(index + canvas.width);
        }

        // Apply overfill expansion to newly filled pixels only
        if (fillOverfill > 0) {
            const overfillMask = new Uint8Array(canvas.width * canvas.height);
            for (let i = 0; i < newlyFilled.length; i++) {
                if (newlyFilled[i]) {
                    const x = i % canvas.width;
                    const y = Math.floor(i / canvas.width);

                    // Mark filled pixels and expand by overfill amount
                    for (let dy = -fillOverfill; dy <= fillOverfill; dy++) {
                        for (let dx = -fillOverfill; dx <= fillOverfill; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                                overfillMask[ny * canvas.width + nx] = 1;
                            }
                        }
                    }
                }
            }

            // Apply overfill to mask
            for (let i = 0; i < overfillMask.length; i++) {
                if (overfillMask[i]) {
                    const offset = i * 4;
                    maskData[offset] = 255;
                    maskData[offset + 1] = 0;
                    maskData[offset + 2] = 0;
                    maskData[offset + 3] = 255;
                }
            }
        }

        maskCtx.putImageData(maskImageData, 0, 0);
        const maskDataURL = getMaskDataUrl();
        if (maskDataURL) {
            setInpaintMask(maskDataURL);
        }
        saveMaskState();
    }, [fillTarget, fillTolerance, fillOverfill, getMaskDataUrl, imageRef, maskCanvasRef, saveMaskState, setInpaintMask]);

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

    // Update border visualization after drawing operations
    useEffect(() => {
        if (maskHistory.length > 0) {
            updateBorderVisualization();
        }
    }, [maskHistory, historyIndex, updateBorderVisualization]);

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
        fillAtPoint,
        saveMaskState,
        undoMask,
        redoMask,
        canUndo,
        canRedo,
    };
}