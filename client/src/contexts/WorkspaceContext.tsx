import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useWorkspaceTabs } from "../hooks/useWorkspaceTabs";
import type { GenerationMode } from "../types/components";
import type { ModelInfo, SamplerInfo } from "../Api";
import type { PromptMode } from "../components/PromptComposer/types";

const STORAGE_KEY_WORKSPACE_STATE = "viteui-workspace-state";

export interface WorkspaceGenerationState {
    selectedModel: string;
    selectedSampler: string;
    clipSkip: number;
    steps: number;
    cfgScale: number;
    width: number;
    height: number;
    batchSize: number;
    count: number;
    denoisingStrength: number;
    inputImage: string | null;
    saveImages: boolean;
    loading: boolean;
    currentTaskId: string | null;
    pendingRestart: boolean;
    seed?: number;
}

export interface WorkspaceModeState {
    generationMode: GenerationMode;
    inpaintMask: string | null;
    maskBlur: number;
    inpaintingFill: number;
    inpaintFullRes: boolean;
    inpaintFullResPadding: number;
    inpaintingMaskInvert: boolean;
    forceInpaintEditMode: boolean;
}

export interface WorkspaceUiState {
    promptMode: PromptMode;
    sidebarCollapsed: boolean;
    propertiesCollapsed: boolean;
    pageLocked: boolean;
}

export interface WorkspaceCanvasState {
    currentImage: string | null;
    canvasRefreshKey: number;
    footerCollapsed: boolean;
    zoom: number;
    panOffset: { x: number; y: number };
    showGrid: boolean;
    fitToScreen: boolean;
    showBorder: boolean;
    maskBorderMode: boolean;
    showMask: boolean;
    brushSize: number;
    drawingMode: string;
    brushHardness: number;
    fillTarget: string;
    fillTolerance: number;
    fillOverfill: number;
}

export interface WorkspaceTransientState {
    canvasElement: HTMLCanvasElement | null;
    canvasContext: CanvasRenderingContext2D | null;
    maskHistory: ImageData[];
    historyIndex: number;
    width: number;
    height: number;
}

export interface WorkspaceState {
    generation: WorkspaceGenerationState;
    mode: WorkspaceModeState;
    ui: WorkspaceUiState;
    canvas: WorkspaceCanvasState;
}

interface WorkspaceContextValue {
    openWorkspaces: string[];
    currentWorkspace: string | null;
    openWorkspace: (workspaceName: string) => void;
    closeWorkspace: (workspaceName: string) => void;
    switchWorkspace: (workspaceName: string) => void;
    closeAllWorkspaces: () => void;
    workspaceStates: Record<string, WorkspaceState>;
    updateWorkspaceState: (workspaceId: string, updater: (prev: WorkspaceState) => WorkspaceState) => void;
    removeWorkspaceState: (workspaceId: string) => void;
    ensureWorkspaceState: (workspaceId: string) => void;
    models: ModelInfo[];
    setModels: Dispatch<SetStateAction<ModelInfo[]>>;
    samplers: SamplerInfo[];
    setSamplers: Dispatch<SetStateAction<SamplerInfo[]>>;
    workspaceBrowserOpen: boolean;
    setWorkspaceBrowserOpen: Dispatch<SetStateAction<boolean>>;
    ensureWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    getWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    removeWorkspaceTransientState: (workspaceId: string) => void;
}

const createDefaultWorkspaceState = (): WorkspaceState => ({
    generation: {
        selectedModel: "",
        selectedSampler: "Euler a",
        clipSkip: 1,
        steps: 20,
        cfgScale: 7,
        width: 512,
        height: 512,
        batchSize: 1,
        count: 1,
        denoisingStrength: 0.75,
        inputImage: null,
        saveImages: false,
        loading: false,
        currentTaskId: null,
        pendingRestart: false,
    },
    mode: {
        generationMode: "txt2img",
        inpaintMask: null,
        maskBlur: 4,
        inpaintingFill: 0,
        inpaintFullRes: true,
        inpaintFullResPadding: 64,
        inpaintingMaskInvert: false,
        forceInpaintEditMode: false,
    },
    ui: {
        promptMode: "simple",
        sidebarCollapsed: false,
        propertiesCollapsed: true,
        pageLocked: false,
    },
    canvas: {
        currentImage: null,
        canvasRefreshKey: 0,
        footerCollapsed: false,
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        showGrid: false,
        fitToScreen: true,
        showBorder: true,
        maskBorderMode: false,
        showMask: true,
        brushSize: 16,
        drawingMode: "brush",
        brushHardness: 1,
        fillTarget: "image",
        fillTolerance: 32,
        fillOverfill: 0,
    },
});

const mergeWorkspaceState = (base: WorkspaceState, partial: Partial<WorkspaceState>): WorkspaceState => ({
    generation: { ...base.generation, ...partial.generation },
    mode: { ...base.mode, ...partial.mode },
    ui: { ...base.ui, ...partial.ui },
    canvas: { ...base.canvas, ...partial.canvas },
});

const loadWorkspaceStates = (): Record<string, WorkspaceState> => {
    if (typeof window === "undefined") {
        return {};
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY_WORKSPACE_STATE);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, Partial<WorkspaceState>>;
        return Object.entries(parsed).reduce<Record<string, WorkspaceState>>((acc, [workspaceId, state]) => {
            acc[workspaceId] = mergeWorkspaceState(createDefaultWorkspaceState(), state);
            return acc;
        }, {});
    } catch (error) {
        console.warn("Failed to load workspace state bundle:", error);
        return {};
    }
};

const stripTransientState = (state: WorkspaceState): WorkspaceState => ({
    ...state,
    generation: {
        ...state.generation,
        loading: false,
        pendingRestart: false,
        currentTaskId: null,
    },
    ui: {
        ...state.ui,
    },
    canvas: {
        ...state.canvas,
        // Timeline is handled by the /workspaces/<workspaceName>/generations endpoint
        // ComposerNodes are handled by the workspace prompt endpoint
    },
});

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
    } = useWorkspaceTabs();
    const [workspaceStates, setWorkspaceStates] = useState<Record<string, WorkspaceState>>(loadWorkspaceStates);
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [samplers, setSamplers] = useState<SamplerInfo[]>([]);
    const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);

    const transientStateRef = useRef(new Map<string, WorkspaceTransientState>());

    const ensureWorkspaceTransientState = useCallback((workspaceId: string) => {
        if (transientStateRef.current.has(workspaceId)) {
            return transientStateRef.current.get(workspaceId) ?? null;
        }

        let canvasElement: HTMLCanvasElement | null = null;
        let canvasContext: CanvasRenderingContext2D | null = null;
        if (typeof document !== "undefined") {
            canvasElement = document.createElement("canvas");
            canvasContext = canvasElement.getContext("2d");
            canvasElement.width = 1;
            canvasElement.height = 1;
        }

        const next: WorkspaceTransientState = {
            canvasElement,
            canvasContext,
            maskHistory: [],
            historyIndex: -1,
            width: canvasElement?.width ?? 0,
            height: canvasElement?.height ?? 0,
        };

        transientStateRef.current.set(workspaceId, next);
        return next;
    }, []);

    const getWorkspaceTransientState = useCallback((workspaceId: string) => {
        return transientStateRef.current.get(workspaceId) ?? null;
    }, []);

    const removeWorkspaceTransientState = useCallback((workspaceId: string) => {
        transientStateRef.current.delete(workspaceId);
    }, []);

    const ensureWorkspaceState = useCallback((workspaceId: string) => {
        setWorkspaceStates((prev) => {
            if (prev[workspaceId]) return prev;
            return {
                ...prev,
                [workspaceId]: createDefaultWorkspaceState(),
            };
        });
        ensureWorkspaceTransientState(workspaceId);
    }, [ensureWorkspaceTransientState]);

    const updateWorkspaceState = useCallback((workspaceId: string, updater: (prev: WorkspaceState) => WorkspaceState) => {
        setWorkspaceStates((prev) => {
            const current = prev[workspaceId] ?? createDefaultWorkspaceState();
            const next = updater(current);
            return { ...prev, [workspaceId]: next };
        });
    }, []);

    const removeWorkspaceState = useCallback((workspaceId: string) => {
        setWorkspaceStates((prev) => {
            if (!prev[workspaceId]) return prev;
            const next = { ...prev };
            delete next[workspaceId];
            return next;
        });
        removeWorkspaceTransientState(workspaceId);
    }, [removeWorkspaceTransientState]);

    useEffect(() => {
        if (openWorkspaces.length === 0) return;
        setWorkspaceStates((prev) => {
            const next = { ...prev };
            for (const workspaceId of openWorkspaces) {
                if (!next[workspaceId]) {
                    next[workspaceId] = createDefaultWorkspaceState();
                }
            }
            return next;
        });
    }, [openWorkspaces]);

    useEffect(() => {
        if (openWorkspaces.length === 0) {
            transientStateRef.current.clear();
            return;
        }

        for (const workspaceId of transientStateRef.current.keys()) {
            if (!openWorkspaces.includes(workspaceId)) {
                transientStateRef.current.delete(workspaceId);
            }
        }
    }, [openWorkspaces]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const persistable = Object.entries(workspaceStates).reduce<Record<string, WorkspaceState>>((acc, [id, state]) => {
                acc[id] = stripTransientState(state);
                return acc;
            }, {});
            localStorage.setItem(STORAGE_KEY_WORKSPACE_STATE, JSON.stringify(persistable));
        } catch (error) {
            console.warn("Failed to persist workspace state bundle:", error);
        }
    }, [workspaceStates]);

    const value = useMemo<WorkspaceContextValue>(() => ({
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
        workspaceStates,
        updateWorkspaceState,
        removeWorkspaceState,
        ensureWorkspaceState,
        models,
        setModels,
        samplers,
        setSamplers,
        workspaceBrowserOpen,
        setWorkspaceBrowserOpen,
        ensureWorkspaceTransientState,
        getWorkspaceTransientState,
        removeWorkspaceTransientState,
    }), [
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
        workspaceStates,
        updateWorkspaceState,
        removeWorkspaceState,
        ensureWorkspaceState,
        models,
        samplers,
        workspaceBrowserOpen,
        ensureWorkspaceTransientState,
        getWorkspaceTransientState,
        removeWorkspaceTransientState,
    ]);

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspaceContext = (): WorkspaceContextValue => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
    }
    return context;
};

export const useWorkspaceState = (workspaceId: string | null) => {
    const { workspaceStates, updateWorkspaceState } = useWorkspaceContext();
    const workspaceState = useMemo(() => {
        if (!workspaceId) {
            return createDefaultWorkspaceState();
        }
        return workspaceStates[workspaceId] ?? createDefaultWorkspaceState();
    }, [workspaceId, workspaceStates]);

    const update = useCallback((updater: (prev: WorkspaceState) => WorkspaceState) => {
        if (!workspaceId) return;
        updateWorkspaceState(workspaceId, updater);
    }, [updateWorkspaceState, workspaceId]);

    return {
        workspaceState,
        updateWorkspaceState: update,
    };
};
