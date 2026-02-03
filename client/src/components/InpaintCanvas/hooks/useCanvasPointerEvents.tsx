import { useCallback, useEffect } from "react";
import type { Dispatch, MouseEvent as ReactMouseEvent, PointerEvent, SetStateAction } from "react";

interface CanvasPointerEventsArgs {
    panTargetRef: React.RefObject<HTMLDivElement>;
    canvasState: {
        panOffset: { x: number; y: number };
        rightClickStartPos: { x: number; y: number };
        rightClickStartPan: { x: number; y: number };
        isRightClickPanning: boolean;
        isDrawing: boolean;
        isPanning: boolean;
        panType: "shift" | "right-click" | null;
        lastDrawPosRef: React.RefObject<{ x: number; y: number } | null>;
        mouseButtonDown: boolean;
        drawingStartedOnCanvas: boolean;
        setPanType: (type: "shift" | "right-click" | null) => void;
        setRightClickStartPos: (pos: { x: number; y: number }) => void;
        setRightClickStartPan: (pos: { x: number; y: number }) => void;
        setIsRightClickPanning: (value: boolean) => void;
        setIsPanning: (value: boolean) => void;
        setIsDrawing: (value: boolean) => void;
        setMouseButtonDown: (value: boolean) => void;
        setDrawingStartedOnCanvas: (value: boolean) => void;
        setLastDrawPos: (pos: { x: number; y: number } | null) => void;
        setPanOffset: Dispatch<SetStateAction<{ x: number; y: number }>>;
    };
    drawing: {
        getCanvasCoordinates: (e: React.MouseEvent<HTMLImageElement>) => { x: number; y: number };
        drawBrush: (x: number, y: number, lastDrawPos: { x: number; y: number } | null) => void;
        clearMask: () => void;
        undoMask: () => void;
        redoMask: () => void;
        getMaskDataUrl: () => string | null;
        saveMaskState: () => void;
        fillAtPoint: (x: number, y: number) => void;
    };
    inputImage?: string | null;
    generationMode?: string;
    drawingMode?: string;
}

export function useCanvasPointerEvents({
    panTargetRef,
    canvasState,
    drawing,
    inputImage,
    generationMode = "txt2img",
    drawingMode = "brush",
}: CanvasPointerEventsArgs) {
    // Right-click pan logic
    const handlePointerDown = useCallback(
        (e: PointerEvent) => {
            if (e.button !== 2) return;
            e.preventDefault();
            e.stopPropagation();
            canvasState.setPanType("right-click");
            canvasState.setRightClickStartPos({ x: e.clientX, y: e.clientY });
            canvasState.setRightClickStartPan({ ...canvasState.panOffset });
            canvasState.setIsRightClickPanning(true);
            const element = e.currentTarget as HTMLElement | null;
            element?.setPointerCapture?.(e.pointerId);
            panTargetRef.current?.requestPointerLock();
        },
        [canvasState, panTargetRef]
    );

    const handlePointerMove = useCallback(
        (e: PointerEvent) => {
            if (!canvasState.isRightClickPanning) return;
            const movementX = e.movementX ?? 0;
            const movementY = e.movementY ?? 0;
            if (movementX !== 0 || movementY !== 0) {
                canvasState.setPanOffset((prev) => ({
                    x: prev.x + movementX,
                    y: prev.y + movementY,
                }));
                return;
            }
            const deltaX = e.clientX - canvasState.rightClickStartPos.x;
            const deltaY = e.clientY - canvasState.rightClickStartPos.y;
            canvasState.setPanOffset({
                x: canvasState.rightClickStartPan.x + deltaX,
                y: canvasState.rightClickStartPan.y + deltaY,
            });
        },
        [canvasState]
    );

    const handlePointerUp = useCallback(
        (e: PointerEvent) => {
            if (!canvasState.isRightClickPanning) return;
            if (e.button !== 2) return;
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            canvasState.setIsRightClickPanning(false);
            const element = e.currentTarget as HTMLElement | null;
            element?.releasePointerCapture?.(e.pointerId);
        },
        [canvasState]
    );

    const handlePointerCancel = useCallback(
        (e: PointerEvent) => {
            if (!canvasState.isRightClickPanning) return;
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            canvasState.setIsRightClickPanning(false);
            const element = e.currentTarget as HTMLElement | null;
            element?.releasePointerCapture?.(e.pointerId);
        },
        [canvasState]
    );

    // Drawing logic
    const handleMouseDown = useCallback(
        (e: ReactMouseEvent) => {
            if (e.button === 2) return; // Skip right-click, handled by pointer events

            if (!(inputImage)) return;

            // Handle shift panning
            if (e.shiftKey) {
                if (!panTargetRef.current) return;
                e.preventDefault();
                canvasState.setPanType('shift');
                canvasState.setRightClickStartPos({ x: e.clientX, y: e.clientY });
                canvasState.setRightClickStartPan({ ...canvasState.panOffset });
                panTargetRef.current.requestPointerLock();
                return;
            }

            // Handle drawing
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
        },
        [canvasState, drawing, inputImage, generationMode, drawingMode, panTargetRef]
    );

    const handleMouseMove = useCallback(
        (e: ReactMouseEvent) => {
            if (!canvasState.isDrawing || generationMode !== "inpaint") return;

            const { x, y } = drawing.getCanvasCoordinates(e as React.MouseEvent<HTMLImageElement>);
            const lastPos = canvasState.lastDrawPosRef.current;
            if (lastPos) {
                drawing.drawBrush(x, y, lastPos);
            } else {
                drawing.drawBrush(x, y, null);
            }
            canvasState.setLastDrawPos({ x, y });
        },
        [canvasState, drawing, generationMode]
    );

    const handleMouseEnter = useCallback(
        (e: ReactMouseEvent) => {
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
        },
        [canvasState, drawing, inputImage, generationMode, drawingMode]
    );

    const handleMouseUp = useCallback(
        (_e: ReactMouseEvent) => {
            // Handle shift panning release
            if (canvasState.panType === 'shift' && document.pointerLockElement === panTargetRef.current) {
                canvasState.setPanType(null);
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                return;
            }

            // Drawing logic now handled at document level
        },
        [canvasState, panTargetRef]
    );

    useEffect(() => {
        const {
            panType,
            isRightClickPanning,
            rightClickStartPos,
            rightClickStartPan,
            setPanOffset,
            setPanType,
            setIsRightClickPanning,
            setIsPanning,
        } = canvasState;

        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === panTargetRef.current;
            setIsPanning(locked);
            if (!locked) {
                if (panType === "right-click" || panType === "shift") {
                    return;
                }
                setPanType(null);
                setIsRightClickPanning(false);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const isPointerLocked = document.pointerLockElement === panTargetRef.current;
            if (isPointerLocked) {

                setPanOffset((prev) => ({
                    x: prev.x + e.movementX,
                    y: prev.y + e.movementY,
                }));
                return;
            }

            if (isRightClickPanning || panType === "shift") {
                const deltaX = e.clientX - rightClickStartPos.x;
                const deltaY = e.clientY - rightClickStartPos.y;
                setPanOffset({
                    x: rightClickStartPan.x + deltaX,
                    y: rightClickStartPan.y + deltaY,
                });
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift" && document.pointerLockElement && panType === "shift") {
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
    }, [
        panTargetRef,
        canvasState.panType,
        canvasState.isRightClickPanning,
        canvasState.rightClickStartPos,
        canvasState.rightClickStartPan,
        canvasState.setPanOffset,
        canvasState.setPanType,
        canvasState.setIsRightClickPanning,
        canvasState.setIsPanning,
    ]);

    return {
        // Pointer events for right-click panning
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,

        // Mouse events for drawing and shift panning
        handleMouseDown,
        handleMouseMove,
        handleMouseEnter,
        handleMouseUp,
    };
}