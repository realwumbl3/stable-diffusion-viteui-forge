// VITE UI
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { GenerationMode } from "../types/components";
import type { PromptMode } from "../components/PromptComposer/types";
import type { ModelInfo, SamplerInfo } from "../Api";

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
    inpaintMaskSnapshot: string | null;
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
}

export interface WorkspaceState {
    generation: WorkspaceGenerationState;
    mode: WorkspaceModeState;
    ui: WorkspaceUiState;
    canvas: WorkspaceCanvasState;
}

export interface WorkspaceTransientState {
    canvasElement: HTMLCanvasElement | null;
    canvasContext: CanvasRenderingContext2D | null;
    maskHistory: ImageData[];
    historyIndex: number;
    width: number;
    height: number;
}

export const createDefaultWorkspaceState = (): WorkspaceState => ({
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
        inpaintMaskSnapshot: null,
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

interface WorkspaceStore {
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
    setModels: (models: ModelInfo[]) => void;
    samplers: SamplerInfo[];
    setSamplers: (samplers: SamplerInfo[]) => void;
    workspaceBrowserOpen: boolean;
    setWorkspaceBrowserOpen: (open: boolean) => void;
    transientStateRef: React.MutableRefObject<Map<string, WorkspaceTransientState>>;
    ensureWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    getWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    removeWorkspaceTransientState: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
    subscribeWithSelector((set, get) => ({
        openWorkspaces: [], // Will be set by useWorkspaceTabs
        currentWorkspace: null, // Will be set by useWorkspaceTabs
        openWorkspace: (workspaceName: string) => {},
        closeWorkspace: (workspaceName: string) => {},
        switchWorkspace: (workspaceName: string) => {},
        closeAllWorkspaces: () => {},
        workspaceStates: loadWorkspaceStates(),
        updateWorkspaceState: (workspaceId, updater) => {
            set((state) => {
                const current = state.workspaceStates[workspaceId] ?? createDefaultWorkspaceState();
                const next = updater(current);
                return {
                    workspaceStates: { ...state.workspaceStates, [workspaceId]: next },
                };
            });
        },
        removeWorkspaceState: (workspaceId) => {
            set((state) => {
                if (!state.workspaceStates[workspaceId]) return state;
                const next = { ...state.workspaceStates };
                delete next[workspaceId];
                return { workspaceStates: next };
            });
            get().removeWorkspaceTransientState(workspaceId);
        },
        ensureWorkspaceState: (workspaceId) => {
            set((state) => {
                if (state.workspaceStates[workspaceId]) return state;
                return {
                    workspaceStates: {
                        ...state.workspaceStates,
                        [workspaceId]: createDefaultWorkspaceState(),
                    },
                };
            });
            get().ensureWorkspaceTransientState(workspaceId);
        },
        models: [],
        setModels: (models) => set({ models }),
        samplers: [],
        setSamplers: (samplers) => set({ samplers }),
        workspaceBrowserOpen: false,
        setWorkspaceBrowserOpen: (open) => set({ workspaceBrowserOpen: open }),
        transientStateRef: { current: new Map<string, WorkspaceTransientState>() },
        ensureWorkspaceTransientState: (workspaceId: string) => {
            const currentRef = get().transientStateRef.current;
            if (currentRef.has(workspaceId)) {
                return currentRef.get(workspaceId) ?? null;
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

            currentRef.set(workspaceId, next);
            return next;
        },
        getWorkspaceTransientState: (workspaceId: string) => {
            return get().transientStateRef.current.get(workspaceId) ?? null;
        },
        removeWorkspaceTransientState: (workspaceId: string) => {
            get().transientStateRef.current.delete(workspaceId);
        },
    }))
);