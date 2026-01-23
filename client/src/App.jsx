import React, { useState, useEffect, useRef } from "react";
import api from "./api";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
import Header from "./components/Header.jsx";
import MainContentArea from "./components/MainContentArea.jsx";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceTabs } from "./hooks/useWorkspaceTabs";

// Simple error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white' }}>
          <h2>Something went wrong:</h2>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
    // Global state - shared across all workspaces
    const [models, setModels] = useState([]);
    const [samplers, setSamplers] = useState([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedSampler, setSelectedSampler] = useState("Euler a");
    const [clipSkip, setClipSkip] = useState(1);

    // Workspace tabs management
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace
    } = useWorkspaceTabs();

    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);
    const [pageLocked, setPageLocked] = useState(false);

    // Workspace state management hook
    const { getWorkspaceState, updateWorkspaceState, initializeWorkspaceState, removeWorkspaceState } = useWorkspaceState();

    // Global loading state for title animation
    const [globalLoading, setGlobalLoading] = useState(false);

    const initialLoadRef = useRef(false);

    useTitleIconAnimation(globalLoading);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        loadInitialData();
        initializeWorkspace();
    }, []);

    // Handle page lock functionality
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (pageLocked) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
                return '';
            }
        };

        if (pageLocked) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [pageLocked]);

    const loadInitialData = async () => {
        try {
            const [modelsData, samplersData, optionsData] = await Promise.all([
                api.getModels(),
                api.getSamplers(),
                api.getOptions(),
            ]);

            setModels(modelsData);
            setSamplers(samplersData);

            // Set currently loaded model
            const currentModelTitle = optionsData.sd_model_checkpoint;
            if (currentModelTitle) {
                // Find the model in the list that matches the current title (which includes hash)
                const currentModel = modelsData.find((model) => model.title === currentModelTitle);
                if (currentModel) {
                    setSelectedModel(currentModel.title);
                } else {
                    // If we can't find the exact match, try to find by hash or model name
                    const hashMatch = currentModelTitle.match(/\[([a-f0-9]+)\]$/);
                    if (hashMatch) {
                        const hash = hashMatch[1];
                        const fallbackModel = modelsData.find(
                            (model) => model.hash === hash || model.title.includes(hash)
                        );
                        if (fallbackModel) {
                            setSelectedModel(fallbackModel.title);
                        } else if (modelsData.length > 0) {
                            // Last resort: use first model
                            setSelectedModel(modelsData[0].title);
                        }
                    } else if (modelsData.length > 0) {
                        // Last resort: use first model
                        setSelectedModel(modelsData[0].title);
                    }
                }
            } else if (modelsData.length > 0) {
                // Fallback to first model if no current model is set
                setSelectedModel(modelsData[0].title);
            }

            // Set currently loaded clip skip
            const currentClipSkip = optionsData.CLIP_stop_at_last_layers;
            console.log("currentClipSkip", currentClipSkip);
            if (currentClipSkip !== undefined && currentClipSkip !== null) {
                setClipSkip(parseInt(currentClipSkip));
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    };

    const initializeWorkspace = async () => {
        try {
            const data = await api.listWorkspaces();
            const workspaces = data.workspaces || [];
            setWorkspaces(workspaces);
            if (workspaces.length > 0) {
                // Check for stored workspace in localStorage
                const lastWorkspace = localStorage.getItem('viteui-current-workspace');
                let selectedWorkspace;

                if (lastWorkspace && workspaces.find(ws => ws.name === lastWorkspace)) {
                    // Use the stored workspace if it still exists
                    selectedWorkspace = workspaces.find(ws => ws.name === lastWorkspace);
                } else {
                    // Fall back to most recently created workspace
                    const sorted = [...workspaces].sort((a, b) => {
                        const aTime = a.created ? new Date(a.created).getTime() : 0;
                        const bTime = b.created ? new Date(b.created).getTime() : 0;
                        return bTime - aTime;
                    });
                    selectedWorkspace = sorted[0];
                }

                openWorkspace(selectedWorkspace.name);
                initializeWorkspaceState(selectedWorkspace.name);
                return;
            }

            const created = await api.createWorkspace("untitled");
            if (created?.name) {
                openWorkspace(created.name);
                // Add the newly created workspace to the list
                setWorkspaces([created]);
                initializeWorkspaceState(created.name);
            }
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
        }
    };

    const handleWorkspaceChange = (workspaceName) => {
        if (!workspaceName) return;

        // Ensure workspace is in tabs (should be handled by openWorkspace, but being safe)
        if (!openWorkspaces.includes(workspaceName)) {
            openWorkspace(workspaceName);
        } else {
            switchWorkspace(workspaceName);
        }

        // Initialize workspace state
        initializeWorkspaceState(workspaceName);
    };

    const handleCreateWorkspace = async (name) => {
        try {
            const result = await api.createWorkspace(name);
            if (result?.name) {
                // Add the new workspace to the list
                setWorkspaces(prev => [...prev, result]);
                // Open it in a new tab
                openWorkspace(result.name);
                initializeWorkspaceState(result.name);
            }
        } catch (error) {
            console.error("Failed to create workspace:", error);
        }
    };

    const handleWorkspaceClose = (workspaceName) => {
        closeWorkspace(workspaceName);
        // Clean up workspace state
        removeWorkspaceState(workspaceName);
    };

    const handleModelChange = async (modelTitle) => {
        setSelectedModel(modelTitle);
        try {
            await api.setModel(modelTitle);
        } catch (error) {
            console.error("Error setting model:", error);
        }
    };

    const handleClipSkipChange = async (newClipSkip) => {
        setClipSkip(newClipSkip);
        try {
            await api.setOptions({ CLIP_stop_at_last_layers: newClipSkip });
        } catch (error) {
            console.error("Error setting clip skip:", error);
        }
    };

    const handleSkip = async () => {
        try {
            console.log("Skipping generation");
            await api.skip();
            console.log("Generation skipped");
        } catch (error) {
            console.error("Error skipping generation:", error);
        }
    };

    const handleInterrupt = async () => {
        try {
            await api.interrupt();
            console.log("Generation interrupt signal sent - waiting for API response");
        } catch (error) {
            console.error("Error sending interrupt signal:", error);
        }
    };



    // Get current workspace state for header props
    const currentWorkspaceState = currentWorkspace ? getWorkspaceState(currentWorkspace) : null;
    const canGenerate = currentWorkspaceState?.composerNodes ?
        currentWorkspaceState.composerNodes.some(node => node.type === 'text' && node.data?.text?.trim()) :
        false;

    // Keyboard shortcuts
    useKeyboardShortcuts({
        "ctrl+g": () => {
            // Generation is now handled by MainContentArea component
        },
        "g": () => {
            // Generation is now handled by MainContentArea component
        },
        "h": () => {
            handleSkip();
        },
        // Generation mode changes are now handled by MainContentArea
        "ctrl+b": () => {}, // Sidebar toggle now handled by MainContentArea
        "ctrl+p": () => {}, // Properties panel toggle now handled by MainContentArea
    });

    return (
        <div className="h-screen flex flex-col bg-studio-bg">
            {/* Header Toolbar */}
            <Header
                loading={globalLoading}
                progress={{ progress: 0, eta_relative: 0, state: { skipped: false, interrupted: false, job: '', job_count: 0, job_timestamp: '', job_no: 0, sampling_step: 0, sampling_steps: 0 } }}
                onGenerate={() => {}} // Generation now handled by MainContentArea
                canGenerate={canGenerate}
                onSkip={handleSkip}
                onRestart={() => {}} // Restart now handled by MainContentArea
                onInterrupt={handleInterrupt}
                openWorkspaces={openWorkspaces}
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onWorkspaceClose={handleWorkspaceClose}
                onCreateWorkspace={handleCreateWorkspace}
                onOpenWorkspaceBrowser={() => setWorkspaceBrowserOpen(true)}
                pageLocked={pageLocked}
                onToggleLock={() => setPageLocked(!pageLocked)}
                pendingRestart={false} // This is now workspace-specific
                // Header controls - get from current workspace state
                steps={currentWorkspaceState?.steps || 20}
                setSteps={(steps) => currentWorkspace && updateWorkspaceState(currentWorkspace, { steps })}
                count={currentWorkspaceState?.count || 1}
                setCount={(count) => currentWorkspace && updateWorkspaceState(currentWorkspace, { count })}
                selectedSampler={currentWorkspaceState?.selectedSampler || 'Euler a'}
                setSelectedSampler={(sampler) => currentWorkspace && updateWorkspaceState(currentWorkspace, { selectedSampler: sampler })}
                cfgScale={currentWorkspaceState?.cfgScale || 7}
                setCfgScale={(cfg) => currentWorkspace && updateWorkspaceState(currentWorkspace, { cfgScale: cfg })}
                models={models}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                samplers={samplers}
                width={currentWorkspaceState?.width || 512}
                setWidth={(width) => currentWorkspace && updateWorkspaceState(currentWorkspace, { width })}
                height={currentWorkspaceState?.height || 512}
                setHeight={(height) => currentWorkspace && updateWorkspaceState(currentWorkspace, { height })}
                referenceImage={currentWorkspaceState?.currentImage || null}
            />

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                {openWorkspaces.map((workspaceName) => (
                    <MainContentArea
                        key={workspaceName}
                        workspaceName={workspaceName}
                        isActive={workspaceName === currentWorkspace}
                        models={models}
                        samplers={samplers}
                        onModelChange={handleModelChange}
                        onClipSkipChange={handleClipSkipChange}
                        onSkip={handleSkip}
                        onInterrupt={handleInterrupt}
                        onRestart={() => {}} // TODO: Pass restart handler from MainContentArea
                        onCreateWorkspace={handleCreateWorkspace}
                        onSelectWorkspace={handleWorkspaceChange}
                        workspaceBrowserOpen={workspaceBrowserOpen}
                        setWorkspaceBrowserOpen={setWorkspaceBrowserOpen}
                    />
                ))}
            </div>
        </div>
    );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
