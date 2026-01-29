import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useWorkspaceContext } from "../../../contexts/WorkspaceContext";
import type { WorkspaceTransientState } from "../../../contexts/WorkspaceContext";

interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}


interface UseDrawingParams {
    inputImage: string | null;
    setInpaintMask: React.Dispatch<React.SetStateAction<string | null>>;
    inpaintFullRes: boolean;
    inpaintFullResPadding: number;
    imageRef: React.RefObject<HTMLImageElement>;
    maskCanvasRef: React.RefObject<HTMLCanvasElement>;
    brushSize: number;
    drawingMode: string;
    brushHardness: number;
    fillTarget: string;
    fillTolerance: number;
    fillOverfill: number;
    generationWidth: number | null;
    generationHeight: number | null;
    workspaceId: string | null;
}

export function useDrawing({
    inputImage,
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
    generationWidth,
    generationHeight,
    workspaceId,
}: UseDrawingParams) {
    const { ensureWorkspaceTransientState } = useWorkspaceContext();
    const transientEntryRef = useRef<WorkspaceTransientState | null>(null);
    // Undo/Redo system
    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Track previous image dimensions to properly scale mask on image changes
    const previousImageDimensions = useRef<{ width: number, height: number } | null>(null);

    useEffect(() => {
        if (!workspaceId) {
            transientEntryRef.current = null;
            setMaskHistory([]);
            setHistoryIndex(-1);
            return;
        }
        const entry = ensureWorkspaceTransientState(workspaceId);
        transientEntryRef.current = entry;
        if (entry?.maskHistory.length && entry.historyIndex >= 0) {
            setMaskHistory(entry.maskHistory);
            setHistoryIndex(entry.historyIndex);
        }
    }, [workspaceId, ensureWorkspaceTransientState]);

    const updateTransientHistory = useCallback((historyData: ImageData[], index: number) => {
        const entry = transientEntryRef.current;
        if (entry) {
            entry.maskHistory = historyData;
            entry.historyIndex = index;
        }
    }, []);


    const getMaskDataUrl = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        const sourceCanvas = maskCanvasRef.current;
        if (sourceCanvas.width === 0 || sourceCanvas.height === 0) return null;

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = sourceCanvas.width;
        exportCanvas.height = sourceCanvas.height;

        const exportCtx = exportCanvas.getContext("2d");
        if (!exportCtx) return null;

        // Optimized mask generation to avoid expensive getImageData
        // Fill background with black
        exportCtx.fillStyle = "black";
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw the mask on top. We use a filter to ensure any painted pixel
        // (regardless of color) becomes white in the exported mask.
        // brightness(0) makes it black, invert(1) makes it white.
        exportCtx.filter = "brightness(0) invert(1)";
        exportCtx.drawImage(sourceCanvas, 0, 0);
        exportCtx.filter = "none";

        const dataUrl = exportCanvas.toDataURL("image/png");

        return dataUrl;
    }, [maskCanvasRef]);

    // Initialize canvases when input image loads (not when result changes)
    useEffect(() => {
        if (!inputImage || !imageRef.current) return;

        const img = imageRef.current;

        const initializeCanvases = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // Ensure we have valid dimensions
            if (naturalWidth > 0 && naturalHeight > 0) {
                // Store current dimensions before resizing (if this is not the first image)
                const currentDimensions = previousImageDimensions.current;
                let previousMaskCanvas: HTMLCanvasElement | null = null;

                if (maskCanvasRef.current && maskCanvasRef.current.width > 0 && maskCanvasRef.current.height > 0) {
                    // Capture the current mask before resizing
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
                    if (previousMaskCanvas && currentDimensions && ctx) {
                        // Scale the previous mask to fit the new canvas dimensions
                        const scaleX = naturalWidth / currentDimensions.width;
                        const scaleY = naturalHeight / currentDimensions.height;
                        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio

                        // Calculate scaled dimensions to fit within new canvas while maintaining aspect ratio
                        const scaledWidth = currentDimensions.width * scale;
                        const scaledHeight = currentDimensions.height * scale;

                        // Center the scaled mask on the new canvas
                        const offsetX = (naturalWidth - scaledWidth) / 2;
                        const offsetY = (naturalHeight - scaledHeight) / 2;

                        ctx.drawImage(previousMaskCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

                        const imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                        setMaskHistory([imageData]);
                        setHistoryIndex(0);
                        updateTransientHistory([imageData], 0);

                        // Update the parent's inpaint mask state with the scaled mask
                        const scaledMaskDataUrl = getMaskDataUrl();
                        if (scaledMaskDataUrl) {
                            setInpaintMask(scaledMaskDataUrl);
                        }
                    } else if (ctx) {
                        // Initialize history with empty state (first-time setup or no previous mask)
                        const emptyImageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
                        setMaskHistory([emptyImageData]);
                        setHistoryIndex(0);
                        updateTransientHistory([emptyImageData], 0);
                    }

                    // Update previous dimensions for next change
                    previousImageDimensions.current = { width: naturalWidth, height: naturalHeight };

                    // Mask is always preserved on image changes unless user clears it explicitly
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
    }, [inputImage, imageRef, maskCanvasRef, getMaskDataUrl, setInpaintMask, setMaskHistory, setHistoryIndex]);

    // Drawing functions
    const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();

        // Calculate coordinates relative to the actual image dimensions
        // The image rect gives us the displayed position and size after transformation
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return { x, y };
    }, [imageRef]);

    const drawBrush = useCallback((x: number, y: number, lastDrawPos: { x: number, y: number } | null) => {
        if (!maskCanvasRef.current) return;

        const ctx = maskCanvasRef.current.getContext("2d");
        if (!ctx) return;
        ctx.globalCompositeOperation = drawingMode === "erase" ? "destination-out" : "source-over";

        if (lastDrawPos) {
            // Draw a line from last position to current position
            ctx.strokeStyle = `rgba(255, 0, 0, ${brushHardness})`;
            ctx.lineWidth = brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(lastDrawPos.x, lastDrawPos.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else {
            // First point, draw a circle
            ctx.fillStyle = `rgba(255, 0, 0, ${brushHardness})`;

            ctx.beginPath();
            ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }, [drawingMode, brushHardness, brushSize, maskCanvasRef]);


    // Calculate bounding box of mask pixels for padding visualization
    const getMaskBounds = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return null;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Optimize bounds calculation by using a smaller temporary canvas
        // This prevents "Out of memory" errors and improves performance on large images.
        const maxDim = 512;
        let scale = 1;
        if (canvas.width > maxDim || canvas.height > maxDim) {
            scale = maxDim / Math.max(canvas.width, canvas.height);
        }

        const scaledWidth = Math.ceil(canvas.width * scale);
        const scaledHeight = Math.ceil(canvas.height * scale);

        const offscreen = document.createElement("canvas");
        offscreen.width = scaledWidth;
        offscreen.height = scaledHeight;
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return null;

        offCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        const imageData = offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        const { data, width, height } = imageData;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        let hasMask = false;
        let pixelCount = 0;

        // Find bounds of masked pixels (alpha > 0)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];

                if (alpha > 0) {
                    hasMask = true;
                    pixelCount++;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasMask) {
            return null;
        }

        // Scale bounds back to original size
        const result = {
            x: Math.floor(minX / scale),
            y: Math.floor(minY / scale),
            width: Math.ceil((maxX - minX + 1) / scale),
            height: Math.ceil((maxY - minY + 1) / scale),
        };

        return result;
    }, [maskCanvasRef]);

    // Undo/Redo functions
    const saveMaskState = useCallback(() => {
        if (!maskCanvasRef.current) return;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setMaskHistory((prev) => {
            // Remove any history after current index (for when user drew after undoing)
            const newHistory = prev.slice(0, historyIndex + 1);

            // Add current state
            newHistory.push(imageData);

            // Limit history to 10 states to prevent memory issues (especially with large images)
            if (newHistory.length > 10) {
                newHistory.shift();
                const nextIndex = newHistory.length - 1;
                setHistoryIndex(nextIndex);
                updateTransientHistory(newHistory, nextIndex);
                return newHistory;
            }
            const nextIndex = newHistory.length - 1;
            setHistoryIndex(nextIndex);
            updateTransientHistory(newHistory, nextIndex);
            return newHistory;
        });

    }, [historyIndex, maskCanvasRef, updateTransientHistory]);

    const clearMask = useCallback(() => {
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            setInpaintMask(null);
            saveMaskState();
        }
    }, [maskCanvasRef, saveMaskState, setInpaintMask]);

    const fillAtPoint = useCallback((x: number, y: number) => {
        if (!maskCanvasRef.current || !imageRef.current) return;

        const canvas = maskCanvasRef.current;
        if (canvas.width === 0 || canvas.height === 0) return;

        const startX = Math.floor(x);
        const startY = Math.floor(y);
        if (startX < 0 || startY < 0 || startX >= canvas.width || startY >= canvas.height) return;

        const maskCtx = canvas.getContext("2d");
        if (!maskCtx) return;
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
        const totalPixels = canvas.width * canvas.height;
        const visited = new Uint8Array(totalPixels);
        const newlyFilled = new Uint8Array(totalPixels);
        const stack = [startIndex];

        let iterations = 0;
        while (stack.length) {
            iterations++;
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
            let overfillPixels = 0;
            for (let i = 0; i < overfillMask.length; i++) {
                if (overfillMask[i]) {
                    overfillPixels++;
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

    const [focusBounds, setFocusBounds] = useState<Bounds | null>(null);
    const [maskBounds, setMaskBounds] = useState<Bounds | null>(null);
    const lastBoundsRef = useRef<{ maskBounds: Bounds | null; focusBounds: Bounds | null } | null>(null);

    const boundsEqual = (a: Bounds | null, b: Bounds | null): boolean => {
        if (a === b) return true;
        if (!a || !b) return false;
        return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    };

    const applyBounds = useCallback((newMaskBounds: Bounds | null, newFocusBounds: Bounds | null) => {
        const previous = lastBoundsRef.current;
        if (
            previous &&
            boundsEqual(previous.maskBounds, newMaskBounds) &&
            boundsEqual(previous.focusBounds, newFocusBounds)
        ) {
            return;
        }
        lastBoundsRef.current = { maskBounds: newMaskBounds, focusBounds: newFocusBounds };
        setMaskBounds(newMaskBounds);
        setFocusBounds(newFocusBounds);
    }, []);


    const getCroppedMaskSnapshot = useCallback(() => {
        if (!maskCanvasRef.current) return null;

        // For masked previews, prioritize maskBounds over focusBounds
        // maskBounds represents the actual mask area, focusBounds is the padded area
        const bounds = maskBounds ?? focusBounds ?? getMaskBounds();
        if (!bounds || bounds.width === 0 || bounds.height === 0) return null;

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = bounds.width;
        exportCanvas.height = bounds.height;

        const ctx = exportCanvas.getContext("2d");
        if (!ctx) return null;

        ctx.clearRect(0, 0, bounds.width, bounds.height);

        ctx.filter = "none";
        ctx.drawImage(
            maskCanvasRef.current,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            0,
            0,
            bounds.width,
            bounds.height
        );
        const imageData = ctx.getImageData(0, 0, bounds.width, bounds.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        return exportCanvas.toDataURL("image/png");
    }, [focusBounds, maskBounds, getMaskBounds, maskCanvasRef]);

    // Calculate focus bounds (independent of canvas) - pure function that returns both bounds
    const calculateBounds = useCallback((): { maskBounds: Bounds | null; focusBounds: Bounds | null } => {
        if (!inpaintFullRes) {
            return { maskBounds: null, focusBounds: null };
        }

        // Get mask bounds
        const bounds = getMaskBounds();
        if (!bounds) {
            return { maskBounds: null, focusBounds: null };
        }

        // Get canvas dimensions from mask canvas
        const canvas = maskCanvasRef.current;
        if (!canvas) {
            return { maskBounds: bounds, focusBounds: null };
        }

        // Calculate padded bounds
        const paddedX = Math.max(0, bounds.x - inpaintFullResPadding);
        const paddedY = Math.max(0, bounds.y - inpaintFullResPadding);
        const paddedWidth = Math.min(canvas.width - paddedX, bounds.width + inpaintFullResPadding * 2);
        const paddedHeight = Math.min(canvas.height - paddedY, bounds.height + inpaintFullResPadding * 2);

        // Calculate focused area based on generation dimensions
        const targetRatio =
            generationWidth && generationHeight && generationHeight > 0
                ? generationWidth / generationHeight
                : paddedHeight > 0
                    ? paddedWidth / paddedHeight
                    : 1;

        let focusedWidth = paddedWidth;
        let focusedHeight = paddedHeight;
        const currentRatio = paddedWidth / (paddedHeight || 1);

        if (targetRatio > 0) {
            if (currentRatio > targetRatio) {
                focusedHeight = paddedWidth / targetRatio;
            } else {
                focusedWidth = paddedHeight * targetRatio;
            }
        }

        focusedWidth = Math.max(focusedWidth, paddedWidth);
        focusedHeight = Math.max(focusedHeight, paddedHeight);

        const centerX = paddedX + paddedWidth / 2;
        const centerY = paddedY + paddedHeight / 2;
        let focusX = centerX - focusedWidth / 2;
        let focusY = centerY - focusedHeight / 2;

        focusedWidth = Math.min(focusedWidth, canvas.width);
        focusedHeight = Math.min(focusedHeight, canvas.height);
        focusX = Math.max(0, Math.min(focusX, Math.max(0, canvas.width - focusedWidth)));
        focusY = Math.max(0, Math.min(focusY, Math.max(0, canvas.height - focusedHeight)));

        return {
            maskBounds: bounds,
            focusBounds: {
                x: focusX,
                y: focusY,
                width: focusedWidth,
                height: focusedHeight,
            },
        };
    }, [inpaintFullRes, inpaintFullResPadding, getMaskBounds, generationWidth, generationHeight, maskCanvasRef]);

    // Update border visualization - use requestAnimationFrame to defer setState
    useEffect(() => {
        const updateBounds = () => {
            const { maskBounds: newMaskBounds, focusBounds: newFocusBounds } = calculateBounds();
            applyBounds(newMaskBounds, newFocusBounds);
        };

        // Defer setState to avoid synchronous setState in effect
        requestAnimationFrame(updateBounds);
    }, [applyBounds, calculateBounds]);

    // Update border visualization after drawing operations
    useEffect(() => {
        if (maskHistory.length > 0) {
            const updateBounds = () => {
                const { maskBounds: newMaskBounds, focusBounds: newFocusBounds } = calculateBounds();
                applyBounds(newMaskBounds, newFocusBounds);
            };

            // Defer setState to avoid synchronous setState in effect
            requestAnimationFrame(updateBounds);
        }
    }, [maskHistory, applyBounds, calculateBounds]);

    const undoMask = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            updateTransientHistory(maskHistory, newIndex);

            const canvas = maskCanvasRef.current;
            if (canvas && maskHistory[newIndex]) {
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.putImageData(maskHistory[newIndex], 0, 0);

                // Update inpaint mask
                const maskDataURL = getMaskDataUrl();
                setInpaintMask(maskDataURL || null);
                // Update bounds after undo
                const { maskBounds: newMaskBounds, focusBounds: newFocusBounds } = calculateBounds();
                applyBounds(newMaskBounds, newFocusBounds);
            }
        }
    }, [historyIndex, maskHistory, getMaskDataUrl, setInpaintMask, calculateBounds, maskCanvasRef, applyBounds, updateTransientHistory]);

    const redoMask = useCallback(() => {
        if (historyIndex < maskHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            updateTransientHistory(maskHistory, newIndex);

            const canvas = maskCanvasRef.current;
            if (canvas && maskHistory[newIndex]) {
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.putImageData(maskHistory[newIndex], 0, 0);

                // Update inpaint mask
                const maskDataURL = getMaskDataUrl();
                setInpaintMask(maskDataURL || null);
                // Update bounds after undo
                const { maskBounds: newMaskBounds, focusBounds: newFocusBounds } = calculateBounds();
                applyBounds(newMaskBounds, newFocusBounds);
            }
        }
    }, [historyIndex, maskHistory, getMaskDataUrl, setInpaintMask, calculateBounds, maskCanvasRef, applyBounds, updateTransientHistory]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < maskHistory.length - 1;

    useEffect(() => {
        const canvas = maskCanvasRef.current;
        const entry = transientEntryRef.current;
        if (!canvas || !entry) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (entry.historyIndex >= 0 && entry.maskHistory[entry.historyIndex]) {
            ctx.putImageData(entry.maskHistory[entry.historyIndex], 0, 0);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, [maskHistory, historyIndex, maskCanvasRef]);

    return useMemo(() => ({
        // Functions
        getCanvasCoordinates,
        drawBrush,
        getMaskDataUrl,
        getCroppedMaskSnapshot,
        clearMask,
        fillAtPoint,
        saveMaskState,
        undoMask,
        redoMask,
        canUndo,
        canRedo,
        focusBounds,
        maskBounds,
        getMaskBounds,
    }), [
        getCanvasCoordinates,
        drawBrush,
        getMaskDataUrl,
        getCroppedMaskSnapshot,
        clearMask,
        fillAtPoint,
        saveMaskState,
        undoMask,
        redoMask,
        canUndo,
        focusBounds,
        maskBounds,
        canRedo,
        getMaskBounds,
    ]);
}
