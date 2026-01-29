import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "./Api";
import Header from "./components/Header";
import Workspace from "./components/Workspace";
import WorkspaceBrowser from "./components/WorkspaceBrowser";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceStore, createDefaultWorkspaceState } from "./contexts/WorkspaceContext";

function App() {
    const openWorkspaces = useWorkspaceStore((state) => state.openWorkspaces);
    const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
    const openWorkspace = useWorkspaceStore((state) => state.openWorkspace);
    const closeWorkspace = useWorkspaceStore((state) => state.closeWorkspace);
    const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace);
    const removeWorkspaceState = useWorkspaceStore((state) => state.removeWorkspaceState);
    const models = useWorkspaceStore((state) => state.models);
    const samplers = useWorkspaceStore((state) => state.samplers);
    const workspaceBrowserOpen = useWorkspaceStore((state) => state.workspaceBrowserOpen);
    const setWorkspaceBrowserOpen = useWorkspaceStore((state) => state.setWorkspaceBrowserOpen);

    const { workspaceStates } = useWorkspaceStore(useCallback(state => ({
        workspaceStates: state.workspaceStates
    }), []));

    const activeWorkspaceState = useMemo(() => {
        if (!currentWorkspace) {
            return createDefaultWorkspaceState();
        }
        return workspaceStates[currentWorkspace] ?? createDefaultWorkspaceState();
    }, [currentWorkspace, workspaceStates]);

    const updateWorkspaceState = useWorkspaceStore(useCallback(state => state.updateWorkspaceState, []));
    const [recentWorkspaceIds, setRecentWorkspaceIds] = useState<string[]>([]);
    const [revealHotkeys, setRevealHotkeys] = useState(true);
    const initialLoadRef = useRef(false);

    const setActiveGenerationState = useCallback((updates: Partial<typeof activeWorkspaceState.generation>) => {
        if (currentWorkspace) {
            updateWorkspaceState(currentWorkspace, (prev) => ({
                ...prev,
                generation: { ...prev.generation, ...updates },
            }));
        }
    }, [updateWorkspaceState, currentWorkspace]);

    const setActiveUiState = useCallback((updates: Partial<typeof activeWorkspaceState.ui>) => {
        if (currentWorkspace) {
            updateWorkspaceState(currentWorkspace, (prev) => ({
                ...prev,
                ui: { ...prev.ui, ...updates },
            }));
        }
    }, [updateWorkspaceState, currentWorkspace]);

    useTitleIconAnimation(activeWorkspaceState.generation.loading);

    useEffect(() => {
        if (!currentWorkspace) return;
        setRecentWorkspaceIds((prev) => {
            const next = [currentWorkspace, ...prev.filter((id) => id !== currentWorkspace)];
            return next.slice(0, 2);
        });
    }, [currentWorkspace]);

    useEffect(() => {
        setRecentWorkspaceIds((prev) => prev.filter((id) => openWorkspaces.includes(id)));
    }, [openWorkspaces]);

    // Toggle hotkey indicators with Shift+?
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === '?') {
                console.log("Revealing hotkeys");
                e.preventDefault();
                setRevealHotkeys((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const initializeWorkspace = useCallback(async (): Promise<void> => {
        try {
            // Just check that workspaces can be loaded, but don't open any automatically
            await api.listWorkspaces();
            // No automatic workspace opening
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
        }
    }, []);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        if (!currentWorkspace && openWorkspaces.length === 0) {
            void initializeWorkspace();
        }
    }, [currentWorkspace, initializeWorkspace, openWorkspaces.length]);

    const handleWorkspaceChange = (workspaceName: string): void => {
        if (!workspaceName) return;
        if (!openWorkspaces.includes(workspaceName)) {
            openWorkspace(workspaceName);
        } else {
            switchWorkspace(workspaceName);
        }
    };

    const handleCreateWorkspace = async (name: string): Promise<void> => {
        try {
            const result = await api.createWorkspace(name);
            if (result?.name) {
                openWorkspace(result.name);
            }
        } catch (error) {
            console.error("Failed to create workspace:", error);
        }
    };

    const handleWorkspaceClose = (workspaceName: string): void => {
        closeWorkspace(workspaceName);
        removeWorkspaceState(workspaceName);
        setRecentWorkspaceIds((prev) => prev.filter((id) => id !== workspaceName));
    };

    const handleModelChange = async (modelTitle: string): Promise<void> => {
        setActiveGenerationState({ selectedModel: modelTitle });
        try {
            await api.setModel(modelTitle);
        } catch (error) {
            console.error("Error setting model:", error);
        }
    };

    const cachedWorkspaceIds = useMemo(() => {
        return recentWorkspaceIds.filter((id) => openWorkspaces.includes(id));
    }, [openWorkspaces, recentWorkspaceIds]);

    return (
        <div className={`h-screen flex flex-col bg-studio-bg ${revealHotkeys ? 'reveal-hotkeys' : ''}`}>

            <div className="flex-1 flex overflow-hidden">
                {cachedWorkspaceIds.map((workspaceId) => (
                    <Workspace
                        key={workspaceId}
                        workspaceId={workspaceId}
                        isActive={workspaceId === currentWorkspace}
                    />
                ))}
                {!workspaceBrowserOpen && cachedWorkspaceIds.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-studio-text-muted text-sm">
                        No workspace open.
                    </div>
                )}
                {workspaceBrowserOpen && (
                    <WorkspaceBrowser
                        currentWorkspace={currentWorkspace}
                        onSelectWorkspace={(name) => {
                            void handleWorkspaceChange(name);
                            setWorkspaceBrowserOpen(false);
                        }}
                        onClose={() => setWorkspaceBrowserOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
