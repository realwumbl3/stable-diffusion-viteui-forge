import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "./Api";
import Header from "./components/Header";
import Workspace from "./components/Workspace";
import WorkspaceBrowser from "./components/WorkspaceBrowser";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceContext, useWorkspaceState } from "./contexts/WorkspaceContext";

function App() {
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        switchWorkspace,
        workspaceBrowserOpen,
        setWorkspaceBrowserOpen,
    } = useWorkspaceContext();
    const { workspaceState: activeWorkspaceState } = useWorkspaceState(currentWorkspace);
    const [recentWorkspaceIds, setRecentWorkspaceIds] = useState<string[]>([]);
    const [revealHotkeys, setRevealHotkeys] = useState(true);
    const initialLoadRef = useRef(false);

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

    const cachedWorkspaceIds = useMemo(() => {
        return recentWorkspaceIds.filter((id) => openWorkspaces.includes(id));
    }, [openWorkspaces, recentWorkspaceIds]);

    const handleWorkspaceChange = useCallback((workspaceName: string) => {
        if (!workspaceName) return;
        if (!openWorkspaces.includes(workspaceName)) {
            openWorkspace(workspaceName);
        } else {
            switchWorkspace(workspaceName);
        }
    }, []);

    return (
        <div className={`h-screen flex flex-col bg-studio-bg ${revealHotkeys ? 'reveal-hotkeys' : ''}`}>
            <Header />

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
                        onSelectWorkspace={handleWorkspaceChange}
                        onClose={() => setWorkspaceBrowserOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
