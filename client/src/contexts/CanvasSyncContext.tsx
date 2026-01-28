import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import type { ReactNode, SetStateAction } from "react";

type PanOffset = {
    x: number;
    y: number;
};

interface CanvasSyncState {
    zoom: number;
    panOffset: PanOffset;
    fitToScreen: boolean;
    showGrid: boolean;
    showMask: boolean;
    showBorder: boolean;
    maskBorderMode: boolean;
    brushSize: number;
    drawingMode: string;
    brushHardness: number;
    fillTarget: string;
    fillTolerance: number;
    fillOverfill: number;
}

const defaultCanvasSyncState: CanvasSyncState = {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    fitToScreen: true,
    showGrid: false,
    showMask: true,
    showBorder: true,
    maskBorderMode: false,
    brushSize: 16,
    drawingMode: "brush",
    brushHardness: 1,
    fillTarget: "image",
    fillTolerance: 32,
    fillOverfill: 0,
};

type CanvasSyncAction =
    | { type: "SET_ZOOM"; value: SetStateAction<number> }
    | { type: "SET_PAN_OFFSET"; value: SetStateAction<PanOffset> }
    | { type: "SET_FIT_TO_SCREEN"; value: SetStateAction<boolean> }
    | { type: "SET_SHOW_GRID"; value: SetStateAction<boolean> }
    | { type: "SET_SHOW_MASK"; value: SetStateAction<boolean> }
    | { type: "SET_SHOW_BORDER"; value: SetStateAction<boolean> }
    | { type: "SET_MASK_BORDER_MODE"; value: SetStateAction<boolean> }
    | { type: "SET_BRUSH_SIZE"; value: SetStateAction<number> }
    | { type: "SET_DRAWING_MODE"; value: SetStateAction<string> }
    | { type: "SET_BRUSH_HARDNESS"; value: SetStateAction<number> }
    | { type: "SET_FILL_TARGET"; value: SetStateAction<string> }
    | { type: "SET_FILL_TOLERANCE"; value: SetStateAction<number> }
    | { type: "SET_FILL_OVERFILL"; value: SetStateAction<number> }
    | { type: "SYNC_STATE"; payload: Partial<CanvasSyncState> };

const CanvasSyncContext = createContext<CanvasSyncContextValue | null>(null);

interface CanvasSyncContextValue extends CanvasSyncState {
    setZoom: (value: SetStateAction<number>) => void;
    setPanOffset: (value: SetStateAction<PanOffset>) => void;
    setFitToScreen: (value: SetStateAction<boolean>) => void;
    setShowGrid: (value: SetStateAction<boolean>) => void;
    setShowMask: (value: SetStateAction<boolean>) => void;
    setShowBorder: (value: SetStateAction<boolean>) => void;
    setMaskBorderMode: (value: SetStateAction<boolean>) => void;
    setBrushSize: (value: SetStateAction<number>) => void;
    setDrawingMode: (value: SetStateAction<string>) => void;
    setBrushHardness: (value: SetStateAction<number>) => void;
    setFillTarget: (value: SetStateAction<string>) => void;
    setFillTolerance: (value: SetStateAction<number>) => void;
    setFillOverfill: (value: SetStateAction<number>) => void;
}

const resolveActionValue = <T,>(current: T, value: SetStateAction<T>): T =>
    typeof value === "function" ? (value as (prev: T) => T)(current) : value;

const haveCanvasSyncStatesChanged = (prev: CanvasSyncState, next: CanvasSyncState): boolean => (
    prev.zoom !== next.zoom ||
    prev.fitToScreen !== next.fitToScreen ||
    prev.showGrid !== next.showGrid ||
    prev.showMask !== next.showMask ||
    prev.showBorder !== next.showBorder ||
    prev.maskBorderMode !== next.maskBorderMode ||
    prev.brushSize !== next.brushSize ||
    prev.drawingMode !== next.drawingMode ||
    prev.brushHardness !== next.brushHardness ||
    prev.fillTarget !== next.fillTarget ||
    prev.fillTolerance !== next.fillTolerance ||
    prev.fillOverfill !== next.fillOverfill ||
    prev.panOffset.x !== next.panOffset.x ||
    prev.panOffset.y !== next.panOffset.y
);

function canvasSyncReducer(state: CanvasSyncState, action: CanvasSyncAction): CanvasSyncState {
    switch (action.type) {
        case "SET_ZOOM":
            return { ...state, zoom: resolveActionValue(state.zoom, action.value) };
        case "SET_PAN_OFFSET":
            return { ...state, panOffset: resolveActionValue(state.panOffset, action.value) };
        case "SET_FIT_TO_SCREEN":
            return { ...state, fitToScreen: resolveActionValue(state.fitToScreen, action.value) };
        case "SET_SHOW_GRID":
            return { ...state, showGrid: resolveActionValue(state.showGrid, action.value) };
        case "SET_SHOW_MASK":
            return { ...state, showMask: resolveActionValue(state.showMask, action.value) };
        case "SET_SHOW_BORDER":
            return { ...state, showBorder: resolveActionValue(state.showBorder, action.value) };
        case "SET_MASK_BORDER_MODE":
            return { ...state, maskBorderMode: resolveActionValue(state.maskBorderMode, action.value) };
        case "SET_BRUSH_SIZE":
            return { ...state, brushSize: resolveActionValue(state.brushSize, action.value) };
        case "SET_DRAWING_MODE":
            return { ...state, drawingMode: resolveActionValue(state.drawingMode, action.value) };
        case "SET_BRUSH_HARDNESS":
            return { ...state, brushHardness: resolveActionValue(state.brushHardness, action.value) };
        case "SET_FILL_TARGET":
            return { ...state, fillTarget: resolveActionValue(state.fillTarget, action.value) };
        case "SET_FILL_TOLERANCE":
            return { ...state, fillTolerance: resolveActionValue(state.fillTolerance, action.value) };
        case "SET_FILL_OVERFILL":
            return { ...state, fillOverfill: resolveActionValue(state.fillOverfill, action.value) };
        case "SYNC_STATE":
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

interface CanvasSyncProviderProps {
    children: ReactNode;
    initialState?: Partial<CanvasSyncState>;
}

export const CanvasSyncProvider = ({ children, initialState }: CanvasSyncProviderProps) => {
    const mergedInitialState = useMemo(
        () => ({ ...defaultCanvasSyncState, ...initialState }),
        [initialState]
    );
    const [state, dispatch] = useReducer(canvasSyncReducer, mergedInitialState);
    const syncedStateRef = useRef<CanvasSyncState | null>(null);

    useEffect(() => {
        if (syncedStateRef.current && !haveCanvasSyncStatesChanged(syncedStateRef.current, mergedInitialState)) {
            return;
        }
        syncedStateRef.current = mergedInitialState;
        dispatch({ type: "SYNC_STATE", payload: mergedInitialState });
    }, [mergedInitialState]);

    const setZoom = useCallback((value: SetStateAction<number>) => {
        dispatch({ type: "SET_ZOOM", value });
    }, []);

    const setPanOffset = useCallback((value: SetStateAction<PanOffset>) => {
        dispatch({ type: "SET_PAN_OFFSET", value });
    }, []);

    const setFitToScreen = useCallback((value: SetStateAction<boolean>) => {
        dispatch({ type: "SET_FIT_TO_SCREEN", value });
    }, []);

    const setShowGrid = useCallback((value: SetStateAction<boolean>) => {
        dispatch({ type: "SET_SHOW_GRID", value });
    }, []);

    const setShowMask = useCallback((value: SetStateAction<boolean>) => {
        dispatch({ type: "SET_SHOW_MASK", value });
    }, []);

    const setShowBorder = useCallback((value: SetStateAction<boolean>) => {
        dispatch({ type: "SET_SHOW_BORDER", value });
    }, []);

    const setMaskBorderMode = useCallback((value: SetStateAction<boolean>) => {
        dispatch({ type: "SET_MASK_BORDER_MODE", value });
    }, []);

    const setBrushSize = useCallback((value: SetStateAction<number>) => {
        dispatch({ type: "SET_BRUSH_SIZE", value });
    }, []);

    const setDrawingMode = useCallback((value: SetStateAction<string>) => {
        dispatch({ type: "SET_DRAWING_MODE", value });
    }, []);

    const setBrushHardness = useCallback((value: SetStateAction<number>) => {
        dispatch({ type: "SET_BRUSH_HARDNESS", value });
    }, []);

    const setFillTarget = useCallback((value: SetStateAction<string>) => {
        dispatch({ type: "SET_FILL_TARGET", value });
    }, []);

    const setFillTolerance = useCallback((value: SetStateAction<number>) => {
        dispatch({ type: "SET_FILL_TOLERANCE", value });
    }, []);

    const setFillOverfill = useCallback((value: SetStateAction<number>) => {
        dispatch({ type: "SET_FILL_OVERFILL", value });
    }, []);


    const value = useMemo(
        () => ({
            ...state,
            setZoom,
            setPanOffset,
            setFitToScreen,
            setShowGrid,
            setShowMask,
            setShowBorder,
            setMaskBorderMode,
            setBrushSize,
            setDrawingMode,
            setBrushHardness,
            setFillTarget,
            setFillTolerance,
            setFillOverfill,
        }),
        [
            state,
            setZoom,
            setPanOffset,
            setFitToScreen,
            setShowGrid,
            setShowMask,
            setShowBorder,
            setMaskBorderMode,
            setBrushSize,
            setDrawingMode,
            setBrushHardness,
            setFillTarget,
            setFillTolerance,
            setFillOverfill,
        ]
    );

    return <CanvasSyncContext.Provider value={value}>{children}</CanvasSyncContext.Provider>;
};

export const useCanvasSync = (): CanvasSyncContextValue => {
    const context = useContextSelector(CanvasSyncContext, (value) => value);
    if (!context) {
        throw new Error("useCanvasSync must be used within CanvasSyncProvider");
    }
    return context;
};

export const useCanvasSyncSelector = <T,>(selector: (state: CanvasSyncContextValue) => T): T => {
    const selected = useContextSelector(CanvasSyncContext, (value) => {
        if (!value) {
            throw new Error("useCanvasSync must be used within CanvasSyncProvider");
        }
        return selector(value);
    });
    return selected;
};
