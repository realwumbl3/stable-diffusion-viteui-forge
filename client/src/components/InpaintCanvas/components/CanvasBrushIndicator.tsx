// VITE UI
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useCanvasSync } from "../../../contexts/CanvasSyncContext";

interface CanvasBrushIndicatorProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    inputImage: string | null | undefined;
    generationMode: string;
    scrollWheelZoomIncrement?: number;
    setBrushSize: (size: number | ((prevSize: number) => number)) => void;
}

const CanvasBrushIndicator: React.FC<CanvasBrushIndicatorProps> = ({
    canvasRef,
    inputImage,
    generationMode,
    scrollWheelZoomIncrement = 4,
    setBrushSize,
}) => {
    const {
        brushSize,
        drawingMode,
        zoom,
    } = useCanvasSync();

    // Brush size indicator state
    const [showBrushIndicator, setShowBrushIndicator] = useState<boolean>(false);
    const cursorPointRef = useRef<HTMLDivElement>(null);
    const brushIndicatorRef = useRef<HTMLDivElement>(null);
    const [isMouseOverCanvas, setIsMouseOverCanvas] = useState<boolean>(false);
    const isMouseOverCanvasRef = useRef<boolean>(isMouseOverCanvas);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const setMouseOverCanvasState = useCallback((value: boolean) => {
        isMouseOverCanvasRef.current = value;
        setIsMouseOverCanvas(value);
    }, []);

    // Show brush indicator when input image is available, drawing mode is supported, and we're in inpaint mode
    const shouldShowBrushIndicator = useMemo(() => {
        return Boolean(inputImage) &&
            generationMode === "inpaint" &&
            (drawingMode === "brush" || drawingMode === "erase");
    }, [inputImage, drawingMode, generationMode]);

    // Sync derived value to state
    useEffect(() => {
        setShowBrushIndicator(shouldShowBrushIndicator);
    }, [shouldShowBrushIndicator]);

    // Alt + scroll for brush size adjustment
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                setBrushSize((prevSize: number) => Math.max(1, Math.min(200, prevSize + scrollWheelZoomIncrement * (e.deltaY > 0 ? -1 : 1))));
            }
        };

        canvasElement.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvasElement.removeEventListener('wheel', handleWheel);
    }, [canvasRef, setBrushSize, scrollWheelZoomIncrement]);

    // Optimized mouse tracking for brush indicator
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        let animationFrameId: number | null = null;

        const updateIndicatorPosition = (e: MouseEvent) => {
            if (!isMouseOverCanvasRef.current) return;

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
                    if (cursorPointElement) {
                        cursorPointElement.style.transform = `translate(${x}px, ${y}px)`;
                    }
                    animationFrameId = null;
                });
            }
        };

        const handleMouseEnter = (): void => {
            setMouseOverCanvasState(true);
        };

        const handleMouseLeave = (): void => {
            setMouseOverCanvasState(false);
        };

        canvasElement.addEventListener('mousemove', updateIndicatorPosition);
        canvasElement.addEventListener('mouseenter', handleMouseEnter);
        canvasElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvasElement.removeEventListener('mousemove', updateIndicatorPosition);
            canvasElement.removeEventListener('mouseenter', handleMouseEnter);
            canvasElement.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [canvasRef, brushSize, zoom, setMouseOverCanvasState]);

    // Update cursor position after zoom changes to prevent uncentering
    useEffect(() => {
        const cursorPointElement = cursorPointRef.current;
        if (!cursorPointElement || !isMouseOverCanvasRef.current) return;

        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const x = lastMousePos.current.x;
        const y = lastMousePos.current.y;

        cursorPointElement.style.transform = `translate(${x}px, ${y}px)`;
    }, [zoom, canvasRef]);

    if (!showBrushIndicator) return null;

    return (
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
                className={`absolute pointer-events-none border-2 border-opacity-60 rounded-full ${drawingMode === 'erase'
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
                    opacity: isMouseOverCanvas ? 1 : 0.7,
                }}
            />
        </div>
    );
};

export default CanvasBrushIndicator;