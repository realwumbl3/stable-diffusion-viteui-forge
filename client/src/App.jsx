import { useState, useEffect, useMemo, useRef } from "react";
import api from "./api";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocketProgress } from "./hooks/useWebSocketProgress";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InpaintCanvas from "./components/InpaintCanvas/components/InpaintCanvas.jsx";
import PropertiesPanel from "./components/PropertiesPanel.jsx";
import Welcome from "./components/Welcome.jsx";
import UpscaleDialog from "./components/UpscaleDialog.jsx";
import WorkspaceBrowser from "./components/WorkspaceBrowser.jsx";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceTabs } from "./hooks/useWorkspaceTabs";
import { WORKSPACE_PREFIX, parseWorkspaceImage, resolveImageSrc, API_BASE_URL } from "./lib/utils";
import { composePromptsFromNodes, generateId } from "./components/PromptComposer/utils/promptUtils";
import { encodeLegacy } from "./components/PromptComposer/utils/legacyEncoding";

function App() {
    const [composerNodes, setComposerNodes] = useState([]);
    const composerPrompts = useMemo(
        () => composePromptsFromNodes(composerNodes),
        [composerNodes]
    );
    const composerPrompt = composerPrompts.positive;
    const composerNegativePrompt = composerPrompts.negative;
    const [workspacePromptLoaded, setWorkspacePromptLoaded] = useState(false);
    const programmaticComposerUpdateRef = useRef(false);
    const initialLoadRef = useRef(false);
    const workspaceChangingRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
    const [pendingRestart, setPendingRestart] = useState(false);

    const createSimpleTextNodes = (positiveText = "", negativeText = "") => [
        {
            id: generateId(),
            type: "text",
            name: "Positive Prompt",
            hidden: false,
            weight: 1,
            value: positiveText,
            mode: "simple-positive",
        },
        {
            id: generateId(),
            type: "text",
            name: "Negative Prompt",
            hidden: false,
            weight: -1,
            value: negativeText,
            mode: "simple-negative",
        },
    ];

    // WebSocket progress tracking
    const { progress, isConnected, livePreview } = useWebSocketProgress(currentTaskId);

    // Model and sampler settings
    const [models, setModels] = useState([]);
    const [samplers, setSamplers] = useState([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedSampler, setSelectedSampler] = useState("Euler a");
    const [clipSkip, setClipSkip] = useState(1);

    // Generation parameters
    const [generationMode, setGenerationMode] = useState("txt2img");

    const handleGenerationModeChange = (mode) => {
        setGenerationMode(mode);
        // When switching to inpaint mode, force edit mode for mask editing
        if (mode === "inpaint") {
            setForceInpaintEditMode(true);
            // Reset after a short delay to allow the effect to take place
            setTimeout(() => setForceInpaintEditMode(false), 100);
            // If there's a current image, use it as input for inpainting
            if (currentImage) {
                setPreserveInpaintMask(true); // Preserve existing mask
                setInputImage(currentImage);
                setInputImageData(null);
            }
        } else {
            setForceInpaintEditMode(false);
            setPreserveInpaintMask(false); // Don't preserve mask when not in inpaint mode
        }
    };

    const handleRefreshCanvas = () => {
        setCanvasRefreshKey(prev => prev + 1);
    };

    // Inpainting parameters
    const [inpaintMask, setInpaintMask] = useState(null);
    const [maskBlur, setMaskBlur] = useState(4);
    const [inpaintingFill, setInpaintingFill] = useState(0);
    const [inpaintFullRes, setInpaintFullRes] = useState(true);
    const [inpaintFullResPadding, setInpaintFullResPadding] = useState(64);
    const [inpaintingMaskInvert, setInpaintingMaskInvert] = useState(false);
    const [canvasPadding, setCanvasPadding] = useState(64);
    const [steps, setSteps] = useState(20);
    const [cfgScale, setCfgScale] = useState(7);
    const [width, setWidth] = useState(512);
    const [height, setHeight] = useState(512);
    const [batchSize, setBatchSize] = useState(1);
    const [count, setCount] = useState(1);

    // img2img parameters
    const [denoisingStrength, setDenoisingStrength] = useState(0.75);
    const [inputImage, setInputImage] = useState(null);

    const [timeline, setTimeline] = useState({
        generationQueue: [], // Array of Generation objects
        currentPreview: null, // Generation object or null
        committedHistory: [], // Array of Generation objects
        discarded: [], // Array of Generation objects
    });

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
    const [inputImageData, setInputImageData] = useState(null);

    // Save settings
    const [saveImages, setSaveImages] = useState(false);

    // UI state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [propertiesCollapsed, setPropertiesCollapsed] = useState(true);
    const [showWelcome, setShowWelcome] = useState(true);
    const [forceInpaintEditMode, setForceInpaintEditMode] = useState(false);
    const [preserveInpaintMask, setPreserveInpaintMask] = useState(false);
    const [pageLocked, setPageLocked] = useState(false);

    // Upscale dialog state
    const [upscaleDialog, setUpscaleDialog] = useState({
        isOpen: false,
        sourceImage: null, // {id, image, type: 'timeline'|'canvas'}
        selectedUpscaler: "Lanczos",
        availableUpscalers: [],
        loading: false,
        error: null,
    });

    useTitleIconAnimation(loading);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        loadInitialData();
        initializeWorkspace();
    }, []);

    // Debug logging for loading state changes
    useEffect(() => {
        console.log("Loading state changed:", loading);
    }, [loading]);

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

    // Reset refresh key when currentImage changes
    useEffect(() => {
        setCanvasRefreshKey(0);
    }, [currentImage]);

    useEffect(() => {
        if (!loading && pendingRestart) {
            if (!composerPrompt.trim()) {
                console.warn("Pending restart aborted because prompt is empty.");
                setPendingRestart(false);
                return;
            }

            setPendingRestart(false);
            generateImage();
        }
    }, [loading, pendingRestart, composerPrompt]);

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
            workspaceChangingRef.current = true;
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
                await loadWorkspaceGenerations(selectedWorkspace.name);
                await loadWorkspacePrompt(selectedWorkspace.name);
                setTimeout(() => {
                    workspaceChangingRef.current = false;
                }, 100);
                return;
            }

            const created = await api.createWorkspace("untitled");
            if (created?.name) {
                openWorkspace(created.name);
                // Add the newly created workspace to the list
                setWorkspaces([created]);
                await loadWorkspaceGenerations(created.name);
                await loadWorkspacePrompt(created.name);
                setTimeout(() => {
                    workspaceChangingRef.current = false;
                }, 100);
            }
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
            workspaceChangingRef.current = false;
        }
    };

    const loadWorkspaceGenerations = async (workspaceName) => {
        if (!workspaceName) return;

        try {
            const generations = await api.getGenerations(workspaceName);

            // Separate generations by status
            const generationQueue = generations.filter(gen => gen.status === 'candidate');
            const committedHistory = generations.filter(gen => gen.status === 'commit');
            const discarded = generations.filter(gen => gen.status === 'reject');

            // Set the latest committed image as the current canvas image
            if (committedHistory.length > 0) {
                setCurrentImage(getGenerationImageUrl(committedHistory[0], 'full'));
            }

            setTimeline({
                generationQueue,
                currentPreview: generationQueue.length > 0 ? generationQueue[0] : null,
                committedHistory,
                discarded,
            });
        } catch (error) {
            console.error("Failed to load workspace generations:", error);
            // Fallback to empty timeline
            setTimeline({
                generationQueue: [],
                currentPreview: null,
                committedHistory: [],
                discarded: [],
            });
        }
    };

    async function loadWorkspacePrompt(workspaceName) {
        if (!workspaceName) {
            setWorkspacePromptLoaded(true);
            return;
        }

        setWorkspacePromptLoaded(false);
        try {
            const workspacePrompt = await api.getWorkspacePrompt(workspaceName);
            const nodes = workspacePrompt.nodes || [];
            programmaticComposerUpdateRef.current = true;
            setComposerNodes(nodes);
        } catch (error) {
            console.error("Failed to load workspace prompt:", error);
        } finally {
            setWorkspacePromptLoaded(true);
        }
    }

    const handleWorkspaceChange = async (workspaceName) => {
        if (!workspaceName) return;

        // Ensure workspace is in tabs (should be handled by openWorkspace, but being safe)
        if (!openWorkspaces.includes(workspaceName)) {
            openWorkspace(workspaceName);
        } else {
            switchWorkspace(workspaceName);
        }

        // Load workspace data
        workspaceChangingRef.current = true;
        setCurrentImage(null);
        setInputImage(null);
        setInputImageData(null);
        setWorkspacePromptLoaded(false);
        setComposerNodes([]);
        await loadWorkspaceGenerations(workspaceName);
        await loadWorkspacePrompt(workspaceName);
        // Small delay to ensure all state updates have settled
        setTimeout(() => {
            workspaceChangingRef.current = false;
        }, 100);
    };

    const handleCreateWorkspace = async (name) => {
        try {
            workspaceChangingRef.current = true;
            const result = await api.createWorkspace(name);
            if (result?.name) {
                // Add the new workspace to the list
                setWorkspaces(prev => [...prev, result]);
                // Open it in a new tab
                openWorkspace(result.name);

                setCurrentImage(null);
                setInputImage(null);
                setInputImageData(null);
                setWorkspacePromptLoaded(false);
                setComposerNodes([]);
                await loadWorkspaceGenerations(result.name);
                await loadWorkspacePrompt(result.name);
                setTimeout(() => {
                    workspaceChangingRef.current = false;
                }, 100);
            }
        } catch (error) {
            console.error("Failed to create workspace:", error);
            workspaceChangingRef.current = false;
        }
    };

    const handleWorkspaceClose = (workspaceName) => {
        closeWorkspace(workspaceName);
        // If closing the current workspace, clear the workspace data
        if (currentWorkspace === workspaceName) {
            setCurrentImage(null);
            setInputImage(null);
            setInputImageData(null);
            setWorkspacePromptLoaded(false);
            setComposerNodes([]);
            setTimeline({
                generationQueue: [],
                currentPreview: null,
                committedHistory: [],
                discarded: [],
            });
        }
    };

    const handleComposerNodesChange = (nodes) => {
        setComposerNodes(nodes);
    };

    useEffect(() => {
        if (!currentWorkspace || !workspacePromptLoaded || workspaceChangingRef.current) return;
        if (programmaticComposerUpdateRef.current) {
            programmaticComposerUpdateRef.current = false;
            return;
        }
        const payload = {
            nodes: composerNodes,
        };
        const timer = setTimeout(() => {
            api.saveWorkspacePrompt(currentWorkspace, payload).catch((error) => {
                console.error("Failed to save workspace prompt:", error);
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [composerNodes, currentWorkspace, workspacePromptLoaded]);

    const toWorkspaceImage = (workspaceName, relativePath) =>
        `${WORKSPACE_PREFIX}${encodeURIComponent(workspaceName)}/${relativePath}`;

    // Get image URL for a generation
    const getGenerationImageUrl = (generation, size = 'full') => {
        if (!generation) return null;
        const asset = size === 'preview' ? '512.png' : 'full.png';
        const category = generation.status === 'commit' ? 'commits' : generation.status === 'reject' ? 'rejects' : 'candidates';
        return `${API_BASE_URL}/api/workspaces/${encodeURIComponent(generation.workspace)}/${category}/${generation.genid}/${asset}`;
    };

    const fetchImageAsDataUrl = async (imageValue) => {
        const imageUrl = resolveImageSrc(imageValue, "full");
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const getBase64Payload = async (imageValue) => {
        if (!imageValue) return null;
        if (typeof imageValue === "string" && imageValue.startsWith("data:")) {
            return imageValue;
        }
        return await fetchImageAsDataUrl(imageValue);
    };

    const generateImage = async () => {
        setPendingRestart(false);
        if (!composerPrompt.trim()) return;
        if ((generationMode === "img2img" || generationMode === "inpaint") && timeline.committedHistory.length === 0) {
            alert("No committed images available for img2img/inpainting. Please generate and commit an image first.");
            return;
        }
        if (generationMode === "inpaint" && !inpaintMask) {
            alert("Please draw or upload a mask for inpainting mode.");
            return;
        }

        if (!currentWorkspace) {
            alert("Workspace not initialized yet. Please wait a moment and try again.");
            return;
        }

        // Validate latest commit exists for img2img/inpaint modes
        if ((generationMode === "img2img" || generationMode === "inpaint") && timeline.committedHistory.length === 0) {
            alert("No committed images available for img2img/inpainting. Please generate and commit an image first.");
            return;
        }

        setLoading(true);
        setCurrentTaskId(null); // Clear previous task ID
        sessionStorage.removeItem('currentTaskId'); // Clear stored task ID

        // Generate task ID first (use sessionStorage to ensure consistency across requests)
        let taskId = sessionStorage.getItem('currentTaskId');
        if (!taskId) {
            taskId = `task(${generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`;
            sessionStorage.setItem('currentTaskId', taskId);
        }


        // Establish WebSocket connection first and wait for it to be ready
        setCurrentTaskId(taskId);

        // Wait a bit for WebSocket connection to establish
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            // Inject prompt composer metadata for generation data preservation
            let promptWithMetadata = composerPrompt;
            if (composerNodes.length > 0) {
                try {
                    const encodedData = encodeLegacy(composerNodes);
                    promptWithMetadata += `\n\n\n\n\n<betterpromptexport:${encodedData}>`;
                } catch (e) {
                    console.warn('Failed to encode prompt metadata for generation:', e);
                }
            }

            const baseParams = {
                prompt: promptWithMetadata,
                negative_prompt: composerNegativePrompt,
                steps: steps,
                width: width,
                height: height,
                cfg_scale: cfgScale,
                sampler_name: selectedSampler,
                batch_size: batchSize,
                n_iter: count,
                clip_skip: clipSkip,
                save_images: saveImages,
                force_task_id: taskId, // Use the same task ID
                workspace_name: currentWorkspace,
            };


            let data;
            if (generationMode === "img2img") {
                const img2imgParams = {
                    ...baseParams,
                    genid: timeline.committedHistory[0].genid,
                    denoising_strength: denoisingStrength,
                };
                data = await api.img2img(img2imgParams);
            } else if (generationMode === "inpaint") {
                const maskBase64Data = inpaintMask.split(",")[1];
                const inpaintParams = {
                    ...baseParams,
                    genid: timeline.committedHistory[0].genid,
                    mask: maskBase64Data,
                    mask_blur: maskBlur,
                    inpainting_fill: inpaintingFill,
                    inpaint_full_res: inpaintFullRes,
                    inpaint_full_res_padding: inpaintFullResPadding,
                    inpainting_mask_invert: inpaintingMaskInvert ? 1 : 0,
                    denoising_strength: denoisingStrength,
                };
                data = await api.img2img(inpaintParams);
            } else {
                data = await api.txt2img(baseParams);
            }

            if ((data.filesystem_paths && data.filesystem_paths.length > 0) || (data.images && data.images.length > 0)) {
                // Reload generations from the backend since they now include proper metadata
                console.log("Loading workspace generations...");
                await loadWorkspaceGenerations(currentWorkspace);
                console.log("Workspace generations loaded");
            }

            // Force clear progress after successful generation
            console.log("Generation completed successfully, clearing progress");
        } catch (error) {
            console.error("Error generating image:", error);

            // Check for specific error types
            if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("404")) {
                // Check if this is likely a missing input image
                if (generationMode === "inpaint" || generationMode === "img2img") {
                    alert("Failed to load input image. The image may no longer be available. Please select a different input image.");
                    // Clear the invalid input image
                    setInputImage(null);
                    setInputImageData(null);
                } else {
                    alert("Network error occurred. Please check your connection and try again.");
                }
            } else if (error.message?.includes("CORS")) {
                alert("CORS error occurred. This may be due to browser security restrictions.");
            } else if (error.message?.includes("interrupted") || error.message?.includes("interrupt")) {
                alert("Generation was interrupted. Please try again.");
            } else {
                alert("Error generating image. Make sure the API server is running on port 7861.");
            }

            // Ensure state is properly reset on error
            resetGenerationState();
        } finally {
            console.log("Finally block: resetting generation state");
            resetGenerationState();
        }
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

    const resetGenerationState = () => {
        console.log("Resetting generation state: loading=false, currentTaskId=null");
        setLoading(false);
        setCurrentTaskId(null);
        sessionStorage.removeItem('currentTaskId'); // Clear stored task ID
    };

    const handleInterrupt = async () => {
        try {
            await api.interrupt();
            console.log("Generation interrupt signal sent - waiting for API response");
            // Don't immediately reset state - wait for the original API request to finish
            // The UI state will be updated when the generation API call completes
        } catch (error) {
            console.error("Error sending interrupt signal:", error);
            // If interrupt API fails, still don't reset state immediately
            // Let the original API request handle state cleanup
        }
    };

    const handleRestart = () => {
        if (!loading) return;
        setPendingRestart(true);
        handleInterrupt();
    };

    const handleEnd = () => {
        if (pendingRestart) {
            setPendingRestart(false);
        }
        handleInterrupt();
    };

    const handleCanvasImageUpload = async (imageSrc) => {
        if (!currentWorkspace) return;
        try {
            const result = await api.importWorkspaceImage(currentWorkspace, imageSrc);
            const workspaceImage = toWorkspaceImage(currentWorkspace, result.image_path);

            // Extract genid from the path (candidates/{genid}/full.png)
            const pathParts = result.image_path.split('/');
            const genid = pathParts.length >= 2 ? pathParts[1] : 'unknown';

            // Create a Generation object for the uploaded image
            const uploadedGeneration = {
                genid,
                status: 'candidate',
                timestamp: Date.now(),
                source: 'upload',
                workspace: currentWorkspace,
                prompt: 'Uploaded image',
                negativePrompt: '',
                parameters: {}
            };

            // Immediately commit the uploaded image
            await api.commitWorkspaceImage(currentWorkspace, `candidates/${genid}/full.png`);

            // Update the uploaded generation to reflect it's now committed
            const committedGeneration = { ...uploadedGeneration, status: 'commit' };

            setInputImage(getGenerationImageUrl(committedGeneration, 'full'));
            setInputImageData(imageSrc);

            setTimeline((prev) => {
                let committedHistory = prev.committedHistory;
                // Add the current canvas image to history if it exists and is different
                if (currentImage) {
                    // Find or create a generation object for the current image
                    const currentGen = prev.committedHistory.find(g => getGenerationImageUrl(g, 'full') === currentImage);
                    if (currentGen) {
                        // Keep the existing generation in history
                    } else {
                        // This shouldn't happen with the new system, but handle it gracefully
                        console.warn('Current image not found in committed history');
                    }
                }
                // Add the uploaded image as committed
                committedHistory = [committedGeneration, ...committedHistory];
                return {
                    ...prev,
                    committedHistory,
                };
            });

            setCurrentImage(getGenerationImageUrl(committedGeneration, 'full'));
        } catch (error) {
            console.error("Failed to import image to workspace:", error);
        }
    };

    const handlePreviewSelect = (generation) => {
        setTimeline((prev) => ({
            ...prev,
            currentPreview: generation,
        }));
    };

    const handleRejectPreview = async () => {
        const preview = timeline.currentPreview;
        if (!preview) return;

        try {
            await api.rejectWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);
        } catch (error) {
            console.error("Failed to reject generation:", error);
        }
    };

    const handleCommitPreview = async () => {
        const preview = timeline.currentPreview;
        if (!preview) return;

        try {
            // Reject all other candidates in the generation queue
            const otherCandidates = timeline.generationQueue.filter(gen => gen.genid !== preview.genid);
            for (const candidate of otherCandidates) {
                try {
                    await api.rejectWorkspaceImage(candidate.workspace, `candidates/${candidate.genid}/full.png`);
                } catch (error) {
                    console.error(`Failed to reject candidate ${candidate.genid}:`, error);
                }
            }

            // Commit the selected preview
            await api.commitWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);

            // Update current image if it was the committed one
            const committedImageUrl = getGenerationImageUrl({ ...preview, status: 'commit' });
            setCurrentImage(committedImageUrl);
            setInputImageData(null);

            if (generationMode === "inpaint") {
                setPreserveInpaintMask(true);
                setInputImage(committedImageUrl);
            } else if (generationMode !== "txt2img") {
                setInputImage(committedImageUrl);
            }
        } catch (error) {
            console.error("Failed to commit generation:", error);
        }
    };

    const handleDiscardGeneration = async (generation) => {
        try {
            await api.deleteWorkspaceImage(generation.workspace, `${generation.status === 'candidate' ? 'candidates' : generation.status === 'commit' ? 'commits' : 'rejects'}/${generation.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);
        } catch (error) {
            console.error("Failed to delete generation:", error);
        }
    };

    const handleRestoreGeneration = async (generation) => {
        try {
            await api.restoreWorkspaceImage(generation.workspace, `${generation.status === 'reject' ? 'rejects' : 'commits'}/${generation.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);
        } catch (error) {
            console.error("Failed to restore generation:", error);
        }
    };

    const handleUncommitGeneration = async (generation) => {
        try {
            await api.uncommitWorkspaceImage(generation.workspace, `commits/${generation.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);
        } catch (error) {
            console.error("Failed to uncommit generation:", error);
        }
    };

    // Upscale functionality
    const handleOpenUpscaleDialog = (sourceImage) => {
        // Fetch available upscalers if not already loaded
        if (upscaleDialog.availableUpscalers.length === 0) {
            api.getUpscalers()
                .then((upscalers) => {
                    setUpscaleDialog((prev) => ({
                        ...prev,
                        availableUpscalers: upscalers,
                        selectedUpscaler: upscalers.length > 0 ? upscalers[0].name : "Lanczos",
                    }));
                })
                .catch((error) => {
                    console.error("Failed to fetch upscalers:", error);
                    setUpscaleDialog((prev) => ({
                        ...prev,
                        error: "Failed to load upscalers",
                    }));
                });
        }

        setUpscaleDialog((prev) => ({
            ...prev,
            isOpen: true,
            sourceImage,
            loading: false,
            error: null,
        }));
    };

    const handleCloseUpscaleDialog = () => {
        setUpscaleDialog((prev) => ({
            ...prev,
            isOpen: false,
            sourceImage: null,
            loading: false,
            error: null,
        }));
    };

    const getWorkspaceImagePath = (sourceImage) => {
        // If sourceImage is a generation object (from timeline), build path from genid and status
        if (sourceImage && sourceImage.genid && sourceImage.workspace) {
            const category = sourceImage.status === 'commit' ? 'commits' 
                : sourceImage.status === 'reject' ? 'rejects' 
                : 'candidates';
            return `${category}/${sourceImage.genid}/full.png`;
        }
        
        // If sourceImage is from canvas, try to extract from currentImage URL or use latest committed
        if (sourceImage && sourceImage.type === 'canvas') {
            // Try to extract workspace path from currentImage URL
            if (currentImage) {
                const workspaceInfo = parseWorkspaceImage(currentImage);
                if (workspaceInfo) {
                    // Extract category and genid from the URL path
                    const pathParts = workspaceInfo.path.split('/');
                    if (pathParts.length >= 2 && ['candidates', 'commits', 'rejects'].includes(pathParts[0])) {
                        const category = pathParts[0];
                        const genid = pathParts[1];
                        return `${category}/${genid}/full.png`;
                    }
                }
            }
            
            // Fallback: use latest committed generation if available
            if (timeline.committedHistory.length > 0) {
                const latestCommit = timeline.committedHistory[0];
                return `commits/${latestCommit.genid}/full.png`;
            }
        }
        
        return null;
    };

    const handleUpscale = async (upscaler, scaleFactor) => {
        if (!upscaleDialog.sourceImage) return;

        // Set loading state
        setUpscaleDialog((prev) => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            if (!currentWorkspace) {
                throw new Error("Workspace not initialized");
            }

            // Try to get workspace_image_path first
            const workspaceImagePath = getWorkspaceImagePath(upscaleDialog.sourceImage);
            
            const params = {
                upscaler_1: upscaler,
                upscaling_resize: scaleFactor,
                resize_mode: 0, // Scale by factor
                show_extras_results: true,
                workspace_name: currentWorkspace,
            };

            // Use workspace path if available, otherwise fall back to base64
            if (workspaceImagePath) {
                params.workspace_image_path = workspaceImagePath;
            } else {
                // Fallback to base64 for non-workspace images
                const sourceImageData = await getBase64Payload(upscaleDialog.sourceImage.image);
                if (!sourceImageData) {
                    throw new Error("No source image data available for upscaling");
                }
                params.image = sourceImageData;
            }

            const result = await api.extraSingleImage(params);

            if (!result.image) {
                throw new Error("Upscale failed. No images returned.");
            }

            // Add the upscaled generation directly to the timeline
            if (result.generation) {
                setTimeline((prev) => ({
                    ...prev,
                    generationQueue: [result.generation, ...prev.generationQueue],
                    currentPreview: result.generation,
                }));
            }

            // Close dialog
            handleCloseUpscaleDialog();
        } catch (error) {
            console.error("Upscale failed:", error);
            setUpscaleDialog((prev) => ({
                ...prev,
                loading: false,
                error: error.message || "Upscale failed. Please try again.",
            }));
        }
    };

    const handleGetStarted = (templatePrompt = "") => {
        if (templatePrompt) {
            setComposerNodes(createSimpleTextNodes(templatePrompt));
        }
        setShowWelcome(false);
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        "ctrl+g": () => {
            if (composerPrompt.trim() && !loading) {
                generateImage();
            }
        },
        "g": () => {
            if (loading) {
                handleInterrupt();
            } else if (composerPrompt.trim()) {
                generateImage();
            }
        },
        "h": () => {
            handleSkip();
        },
        "alt+t": () => handleGenerationModeChange("txt2img"),
        "alt+i": () => handleGenerationModeChange("img2img"),
        "alt+n": () => handleGenerationModeChange("inpaint"),
        "ctrl+b": () => setSidebarCollapsed(!sidebarCollapsed),
        "ctrl+p": () => setPropertiesCollapsed(!propertiesCollapsed),
    });

    // Show welcome screen if no images have been generated and user hasn't dismissed it
    const hasTimelineContent = Boolean(
        currentImage ||
        timeline.currentPreview ||
        timeline.generationQueue.length ||
        timeline.committedHistory.length ||
        timeline.discarded.length
    );

    if (showWelcome && !hasTimelineContent) {
        return (
            <div className="h-screen flex flex-col bg-studio-bg">
                {/* Header Toolbar */}
                <Header
                    loading={loading}
                    progress={progress}
                    onGenerate={generateImage}
                    canGenerate={!!composerPrompt.trim()}
                    onSkip={handleSkip}
                    onRestart={handleRestart}
                    onInterrupt={handleEnd}
                    currentWorkspace={currentWorkspace}
                    workspaces={workspaces}
                    onWorkspaceChange={handleWorkspaceChange}
                    onCreateWorkspace={handleCreateWorkspace}
                    onOpenWorkspace={() => setWorkspaceBrowserOpen(true)}
                    pageLocked={pageLocked}
                    onToggleLock={() => setPageLocked(!pageLocked)}
                    // New header controls
                    steps={steps}
                    setSteps={setSteps}
                    count={count}
                    setCount={setCount}
                    selectedSampler={selectedSampler}
                    setSelectedSampler={setSelectedSampler}
                    cfgScale={cfgScale}
                    setCfgScale={setCfgScale}
                    models={models}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    samplers={samplers}
                    width={width}
                    setWidth={setWidth}
                    height={height}
                    setHeight={setHeight}
                    inputImage={inputImage}
                />

                {/* Welcome Screen */}
                <Welcome onGetStarted={handleGetStarted} />

                {workspaceBrowserOpen && (
                    <WorkspaceBrowser
                        currentWorkspace={currentWorkspace}
                        onSelectWorkspace={(name) => {
                            handleWorkspaceChange(name);
                            setWorkspaceBrowserOpen(false);
                        }}
                        onClose={() => setWorkspaceBrowserOpen(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-studio-bg">
            {/* Header Toolbar */}
            <Header
                loading={loading}
                progress={progress}
                onGenerate={generateImage}
                    canGenerate={!!composerPrompt.trim()}
                onSkip={handleSkip}
                onRestart={handleRestart}
                onInterrupt={handleEnd}
                openWorkspaces={openWorkspaces}
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onWorkspaceClose={handleWorkspaceClose}
                onCreateWorkspace={handleCreateWorkspace}
                onOpenWorkspaceBrowser={() => setWorkspaceBrowserOpen(true)}
                pageLocked={pageLocked}
                onToggleLock={() => setPageLocked(!pageLocked)}
                // New header controls
                steps={steps}
                setSteps={setSteps}
                count={count}
                setCount={setCount}
                selectedSampler={selectedSampler}
                setSelectedSampler={setSelectedSampler}
                cfgScale={cfgScale}
                setCfgScale={setCfgScale}
                models={models}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                samplers={samplers}
                width={width}
                setWidth={setWidth}
                height={height}
                setHeight={setHeight}
                inputImage={inputImage}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    timeline={timeline}
                    currentImage={currentImage}
                    onPreviewSelect={handlePreviewSelect}
                    onCommitPreview={handleCommitPreview}
                    onRejectPreview={handleRejectPreview}
                    onDiscardGeneration={handleDiscardGeneration}
                    onRestoreGeneration={handleRestoreGeneration}
                    onUncommitGeneration={handleUncommitGeneration}
                    onGenerationModeChange={handleGenerationModeChange}
                    generationMode={generationMode}
                    onUpscale={handleOpenUpscaleDialog}
                    getGenerationImageUrl={getGenerationImageUrl}
                    onRefreshTimeline={() => loadWorkspaceGenerations(currentWorkspace)}
                    onRefreshCanvas={handleRefreshCanvas}
                    canvasRefreshKey={canvasRefreshKey}
                />

                {/* Main Canvas Area */}
                {generationMode === "inpaint" ? (
                    <InpaintCanvas
                        currentImage={currentImage}
                        previewImage={getGenerationImageUrl(timeline.currentPreview)}
                        inputImage={inputImage}
                        livePreview={livePreview}
                        loading={loading}
                        progress={progress}
                        generationWidth={width}
                        generationHeight={height}
                        composerNodes={composerNodes}
                        onComposerNodesChange={handleComposerNodesChange}
                        inpaintMask={inpaintMask}
                        setInpaintMask={setInpaintMask}
                        onImageUpload={handleCanvasImageUpload}
                        inpaintFullRes={inpaintFullRes}
                        inpaintFullResPadding={inpaintFullResPadding}
                        setInpaintFullResPadding={setInpaintFullResPadding}
                        setInpaintFullRes={setInpaintFullRes}
                        forceEditMode={forceInpaintEditMode}
                        maskBlur={maskBlur}
                        setMaskBlur={setMaskBlur}
                        inpaintingFill={inpaintingFill}
                        setInpaintingFill={setInpaintingFill}
                        denoisingStrength={denoisingStrength}
                        setDenoisingStrength={setDenoisingStrength}
                        inpaintingMaskInvert={inpaintingMaskInvert}
                        setInpaintingMaskInvert={setInpaintingMaskInvert}
                        canvasPadding={canvasPadding}
                        generationMode={generationMode}
                        canvasRefreshKey={canvasRefreshKey}
                    />
                ) : (
                    <InpaintCanvas
                        currentImage={currentImage}
                        previewImage={getGenerationImageUrl(timeline.currentPreview)}
                        livePreview={livePreview}
                        loading={loading}
                        progress={progress}
                        generationWidth={width}
                        generationHeight={height}
                        composerNodes={composerNodes}
                        onComposerNodesChange={handleComposerNodesChange}
                        // Inpainting specific props - provide defaults for non-inpaint modes
                        setInpaintMask={() => { }}
                        forceEditMode={false}
                        maskBlur={maskBlur}
                        setMaskBlur={setMaskBlur}
                        inpaintingFill={inpaintingFill}
                        setInpaintingFill={setInpaintingFill}
                        denoisingStrength={denoisingStrength}
                        setDenoisingStrength={setDenoisingStrength}
                        setInpaintFullRes={() => { }}
                        inpaintingMaskInvert={inpaintingMaskInvert}
                        setInpaintingMaskInvert={setInpaintingMaskInvert}
                        canvasPadding={canvasPadding}
                        // Image upload props for img2img mode
                        inputImage={generationMode === "img2img" ? inputImage : null}
                        onImageUpload={generationMode === "img2img" ? handleCanvasImageUpload : null}
                        // Full resolution inpainting props - defaults for non-inpaint modes
                        inpaintFullRes={false}
                        inpaintFullResPadding={0}
                        setInpaintFullResPadding={() => { }}
                        generationMode={generationMode}
                        canvasRefreshKey={canvasRefreshKey}
                    />
                )}

                {/* Right Properties Panel */}
                <PropertiesPanel
                    collapsed={propertiesCollapsed}
                    onToggle={() => setPropertiesCollapsed(!propertiesCollapsed)}
                    // Generation settings
                    generationMode={generationMode}
                    setGenerationMode={setGenerationMode}
                    width={width}
                    setWidth={setWidth}
                    height={height}
                    setHeight={setHeight}
                    batchSize={batchSize}
                    setBatchSize={setBatchSize}
                    denoisingStrength={denoisingStrength}
                    setDenoisingStrength={setDenoisingStrength}
                    inputImage={inputImage}
                    onImageUpload={handleCanvasImageUpload}
                    clipSkip={clipSkip}
                    onClipSkipChange={handleClipSkipChange}
                    saveImages={saveImages}
                    setSaveImages={setSaveImages}
                />

                {/* Upscale Dialog */}
                <UpscaleDialog
                    isOpen={upscaleDialog.isOpen}
                    onClose={handleCloseUpscaleDialog}
                    onUpscale={handleUpscale}
                    sourceImage={upscaleDialog.sourceImage}
                    selectedUpscaler={upscaleDialog.selectedUpscaler}
                    availableUpscalers={upscaleDialog.availableUpscalers}
                    loading={upscaleDialog.loading}
                    error={upscaleDialog.error}
                />

                {workspaceBrowserOpen && (
                    <WorkspaceBrowser
                        currentWorkspace={currentWorkspace}
                        onSelectWorkspace={(name) => {
                            handleWorkspaceChange(name);
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
