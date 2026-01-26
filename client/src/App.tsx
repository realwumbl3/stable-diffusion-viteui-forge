import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "./Api";
import Header from "./components/Header";
import Workspace from "./components/Workspace";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceContext, useWorkspaceState } from "./contexts/WorkspaceContext";

function App() {
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        removeWorkspaceState,
        models,
        samplers,
        workspaceBrowserOpen,
        setWorkspaceBrowserOpen,
    } = useWorkspaceContext();
    const { workspaceState: activeWorkspaceState, updateWorkspaceState } = useWorkspaceState(currentWorkspace);
    const [recentWorkspaceIds, setRecentWorkspaceIds] = useState<string[]>([]);
    const [revealHotkeys, setRevealHotkeys] = useState(true);
    const initialLoadRef = useRef(false);

    const setActiveGenerationState = useCallback((updates: Partial<typeof activeWorkspaceState.generation>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            generation: { ...prev.generation, ...updates },
        }));
    }, [updateWorkspaceState]);

    const setActiveUiState = useCallback((updates: Partial<typeof activeWorkspaceState.ui>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            ui: { ...prev.ui, ...updates },
        }));
    }, [updateWorkspaceState]);

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
            const data = await api.listWorkspaces();
            const workspaces = data.workspaces || [];
            if (workspaces.length > 0) {
                const lastWorkspace = localStorage.getItem("viteui-current-workspace");
                let selectedWorkspace = lastWorkspace
                    ? workspaces.find((ws) => ws.name === lastWorkspace)
                    : undefined;

                if (!selectedWorkspace) {
                    const sorted = [...workspaces].sort((a, b) => {
                        const aTime = a.created ? new Date(a.created).getTime() : 0;
                        const bTime = b.created ? new Date(b.created).getTime() : 0;
                        return bTime - aTime;
                    });
                    selectedWorkspace = sorted[0];
                }

                openWorkspace(selectedWorkspace!.name);
                return;
            }

            const created = await api.createWorkspace("untitled");
            if (created?.name) {
                openWorkspace(created.name);
            }
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
        }
    }, [openWorkspace]);

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
            <Header
                openWorkspaces={openWorkspaces}
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onWorkspaceClose={handleWorkspaceClose}
                onCreateWorkspace={handleCreateWorkspace}
                onOpenWorkspaceBrowser={() => setWorkspaceBrowserOpen(true)}
                pageLocked={activeWorkspaceState.ui.pageLocked}
                onToggleLock={() => setActiveUiState({ pageLocked: !activeWorkspaceState.ui.pageLocked })}
                models={models}
                selectedModel={activeWorkspaceState.generation.selectedModel}
                onModelChange={handleModelChange}
                samplers={samplers}
                selectedSampler={activeWorkspaceState.generation.selectedSampler}
                setSelectedSampler={(value) => setActiveGenerationState({ selectedSampler: value })}
                cfgScale={activeWorkspaceState.generation.cfgScale}
                setCfgScale={(value) => setActiveGenerationState({ cfgScale: value })}
            />

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
            </div>
        </div>
    );
}

export default App;
