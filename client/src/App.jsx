import { useState, useEffect } from "react";
import api from "./api";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocketProgress } from "./hooks/useWebSocketProgress";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Canvas from "./components/Canvas.jsx";
import InpaintCanvas from "./components/InpaintCanvas.jsx";
import PropertiesPanel from "./components/PropertiesPanel.jsx";
import Welcome from "./components/Welcome.jsx";
import UpscaleDialog from "./components/UpscaleDialog.jsx";
import WorkspaceBrowser from "./components/WorkspaceBrowser.jsx";
import { WORKSPACE_PREFIX, parseWorkspaceImage, resolveImageSrc, API_BASE_URL } from "./lib/utils";

function App() {
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [currentTaskId, setCurrentTaskId] = useState(null);

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

    // Inpainting parameters
    const [inpaintMask, setInpaintMask] = useState(null);
    const [maskBlur, setMaskBlur] = useState(4);
    const [inpaintingFill, setInpaintingFill] = useState(0);
    const [inpaintFullRes, setInpaintFullRes] = useState(true);
    const [inpaintFullResPadding, setInpaintFullResPadding] = useState(0);
    const [inpaintingMaskInvert, setInpaintingMaskInvert] = useState(false);
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

    const [currentWorkspace, setCurrentWorkspace] = useState(null);
    const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);
    const [inputImageData, setInputImageData] = useState(null);

    // Save settings
    const [saveImages, setSaveImages] = useState(true);
    const [saveGrids, setSaveGrids] = useState(false);

    // UI state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [forceInpaintEditMode, setForceInpaintEditMode] = useState(false);
    const [preserveInpaintMask, setPreserveInpaintMask] = useState(false);

    // Upscale dialog state
    const [upscaleDialog, setUpscaleDialog] = useState({
        isOpen: false,
        sourceImage: null, // {id, image, type: 'timeline'|'canvas'}
        selectedUpscaler: "Lanczos",
        availableUpscalers: [],
        loading: false,
        error: null,
    });

    useEffect(() => {
        loadInitialData();
        initializeWorkspace();
    }, []);

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
            if (workspaces.length > 0) {
                const sorted = [...workspaces].sort((a, b) => {
                    const aTime = a.created ? new Date(a.created).getTime() : 0;
                    const bTime = b.created ? new Date(b.created).getTime() : 0;
                    return bTime - aTime;
                });
                setCurrentWorkspace(sorted[0].name);
                await loadWorkspaceGenerations(sorted[0].name);
                return;
            }

            const created = await api.createWorkspace("untitled");
            if (created?.name) {
                setCurrentWorkspace(created.name);
                await loadWorkspaceGenerations(created.name);
            }
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
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

    const handleWorkspaceChange = (workspaceName) => {
        if (!workspaceName) return;
        setCurrentWorkspace(workspaceName);
        setCurrentImage(null);
        setInputImage(null);
        setInputImageData(null);
        loadWorkspaceGenerations(workspaceName);
    };

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

    const createTimelineItem = (image, overrides = {}) => ({
        id: `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        image,
        createdAt: Date.now(),
        ...overrides,
    });

    const appendCommittedImage = (history, image, source) => {
        if (!image) return history;
        if (history[0]?.image === image) return history;
        return [createTimelineItem(image, { source }), ...history];
    };

    const generateImage = async () => {
        if (!prompt.trim()) return;
        if ((generationMode === "img2img" || generationMode === "inpaint") && !inputImage) {
            alert("Please upload an input image for img2img/inpaint mode.");
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

        setLoading(true);
        setCurrentTaskId(null); // Clear previous task ID

        // Generate task ID first
        const taskId = `task(${generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`;

        // Establish WebSocket connection first and wait for it to be ready
        setCurrentTaskId(taskId);

        // Wait a bit for WebSocket connection to establish
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            const baseParams = {
                prompt: prompt,
                negative_prompt: negativePrompt,
                steps: steps,
                width: width,
                height: height,
                cfg_scale: cfgScale,
                sampler_name: selectedSampler,
                batch_size: batchSize,
                n_iter: count,
                clip_skip: clipSkip,
                save_images: saveImages,
                save_grids: saveGrids,
                force_task_id: taskId, // Use the same task ID
                workspace_name: currentWorkspace,
            };

            let data;
            if (generationMode === "img2img") {
                // Extract base64 data from data URL
                const imageDataUrl = inputImageData || (await getBase64Payload(inputImage));
                if (!imageDataUrl) {
                    throw new Error("No input image data available");
                }
                const base64Data = imageDataUrl.split(",")[1];
                const img2imgParams = {
                    ...baseParams,
                    init_images: [base64Data],
                    denoising_strength: denoisingStrength,
                };
                data = await api.img2img(img2imgParams);
            } else if (generationMode === "inpaint") {
                // Extract base64 data from data URLs
                const imageDataUrl = inputImageData || (await getBase64Payload(inputImage));
                if (!imageDataUrl) {
                    throw new Error("No input image data available");
                }
                const base64Data = imageDataUrl.split(",")[1];
                const maskBase64Data = inpaintMask.split(",")[1];
                const inpaintParams = {
                    ...baseParams,
                    init_images: [base64Data],
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
                data = await api.txt2imgSimple(baseParams);
            }

            if ((data.filesystem_paths && data.filesystem_paths.length > 0) || (data.images && data.images.length > 0)) {
                // Reload generations from the backend since they now include proper metadata
                await loadWorkspaceGenerations(currentWorkspace);
            }
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Error generating image. Make sure the API server is running on port 7861.");
        } finally {
            setLoading(false);
            setCurrentTaskId(null); // Clear task ID when done
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

    const handleInterrupt = async () => {
        try {
            await api.interrupt();
            console.log("Generation interrupted");
        } catch (error) {
            console.error("Error interrupting generation:", error);
        }
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
            await api.rejectWorkspaceImage(generation.workspace, `${generation.status === 'candidate' ? 'candidates' : generation.status === 'commit' ? 'commits' : 'rejects'}/${generation.genid}/full.png`);
            // Reload generations to get updated status
            await loadWorkspaceGenerations(currentWorkspace);
        } catch (error) {
            console.error("Failed to discard generation:", error);
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

    const commitWorkspaceCommit = async (item) => {
        const info = parseWorkspaceImage(item?.image);
        if (!info) return;

        try {
            const result = await api.commitWorkspaceImage(info.workspace, info.path);
            console.log("Commit result:", result);
            if (result.success && result.commit_path) {
                // The backend might return a path that includes the workspace name
                // Strip the workspace name if present to avoid duplication
                let commitPath = result.commit_path;
                const workspacePrefix = `${info.workspace}/`;
                console.log("Original commitPath:", commitPath, "workspacePrefix:", workspacePrefix);
                if (commitPath.startsWith(workspacePrefix)) {
                    commitPath = commitPath.slice(workspacePrefix.length);
                    console.log("Stripped commitPath:", commitPath);
                }

                // Update the image path to point to the committed location
                const newImagePath = `workspace://${info.workspace}/${commitPath}`;
                console.log("New image path:", newImagePath);

                // Update the timeline item with the new path
                setTimeline((prev) => {
                    const updateItemInArray = (arrayItem) => {
                        if (arrayItem.id === item.id) {
                            console.log("Updating item", arrayItem.id, "from", arrayItem.image, "to", newImagePath);
                            return { ...arrayItem, image: newImagePath };
                        }
                        return arrayItem;
                    };

                    return {
                        ...prev,
                        generationQueue: prev.generationQueue.map(updateItemInArray),
                        committedHistory: prev.committedHistory.map(updateItemInArray),
                        discarded: prev.discarded.map(updateItemInArray),
                        currentPreview: prev.currentPreview?.id === item.id ? { ...prev.currentPreview, image: newImagePath } : prev.currentPreview,
                    };
                });

                // Also update currentImage if it matches the old path
                setCurrentImage((prev) => prev === item.image ? newImagePath : prev);
                // Update inputImage if it matches the old path
                setInputImage((prev) => prev === item.image ? newImagePath : prev);
            }
        } catch (error) {
            console.error("Failed to commit workspace image:", error);
        }
    };

    const commitWorkspaceReject = async (item) => {
        const info = parseWorkspaceImage(item?.image);

        try {
            if (info) {
                const result = await api.rejectWorkspaceImage(info.workspace, info.path);
                console.log("Reject result:", result);
                if (result.success && result.reject_path) {
                    // Update the image path to point to the rejected location
                    let rejectPath = result.reject_path;
                    const workspacePrefix = `${info.workspace}/`;
                    if (rejectPath.startsWith(workspacePrefix)) {
                        rejectPath = rejectPath.slice(workspacePrefix.length);
                    }

                    const newImagePath = `workspace://${info.workspace}/${rejectPath}`;

                    // Create updated item with new path and add to discarded
                    const updatedItem = { ...item, image: newImagePath };
                    setTimeline((prev) => ({
                        ...prev,
                        discarded: [updatedItem, ...prev.discarded],
                    }));
                    return; // Successfully rejected, return early
                }
            }
            // If we get here, either parsing failed or API call failed
            // Fall through to add with original path
        } catch (error) {
            console.error("Failed to reject workspace image:", error);
            // Fall through to add with original path
        }

        // Always ensure the item gets added to discarded, even if workspace operations fail
        setTimeline((prev) => ({
            ...prev,
            discarded: [item, ...prev.discarded],
        }));
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

    const handleUpscale = async (upscaler, scaleFactor) => {
        if (!upscaleDialog.sourceImage) return;

        // Set loading state
        setUpscaleDialog((prev) => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            const sourceImageData = await getBase64Payload(upscaleDialog.sourceImage.image);
            if (!sourceImageData) {
                throw new Error("No source image data available for upscaling");
            }
            const params = {
                image: sourceImageData,
                upscaler_1: upscaler,
                upscaling_resize: scaleFactor,
                resize_mode: 0, // Scale by factor
                show_extras_results: true,
            };

            const result = await api.extraSingleImage(params);

            if (!result.image) {
                throw new Error("Upscale failed. No images returned.");
            }

            if (!currentWorkspace) {
                throw new Error("Workspace not initialized");
            }

            const imported = await api.importWorkspaceImage(
                currentWorkspace,
                `data:image/png;base64,${result.image}`
            );
            const workspaceImage = toWorkspaceImage(currentWorkspace, imported.image_path);

            // Create timeline item for the upscaled result
            const upscaledItem = {
                id: `upscale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                image: workspaceImage,
                timestamp: Date.now(),
                type: "upscale",
                source: "generation",
                prompt: `Upscaled ${upscaleDialog.sourceImage.type} image`,
                parameters: {
                    source: upscaleDialog.sourceImage.type,
                    upscaler: upscaler,
                    scaleFactor: scaleFactor,
                },
            };

            // Add to generation queue and set as current preview
            setTimeline((prev) => ({
                ...prev,
                generationQueue: [upscaledItem, ...prev.generationQueue],
                currentPreview: upscaledItem,
            }));

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
            setPrompt(templatePrompt);
        }
        setShowWelcome(false);
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        "ctrl+g": () => {
            if (prompt.trim() && !loading) {
                generateImage();
            }
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
                    canGenerate={!!prompt.trim()}
                    generationMode={generationMode}
                    setGenerationMode={setGenerationMode}
                    onSkip={handleSkip}
                    onInterrupt={handleInterrupt}
                    currentWorkspace={currentWorkspace}
                    onWorkspaceChange={handleWorkspaceChange}
                    onOpenWorkspace={() => setWorkspaceBrowserOpen(true)}
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
                canGenerate={!!prompt.trim()}
                generationMode={generationMode}
                setGenerationMode={handleGenerationModeChange}
                onSkip={handleSkip}
                onInterrupt={handleInterrupt}
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onOpenWorkspace={() => setWorkspaceBrowserOpen(true)}
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
                    onUpscale={handleOpenUpscaleDialog}
                    getGenerationImageUrl={getGenerationImageUrl}
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
                        prompt={prompt}
                        setPrompt={setPrompt}
                        negativePrompt={negativePrompt}
                        setNegativePrompt={setNegativePrompt}
                        inpaintMask={inpaintMask}
                        setInpaintMask={setInpaintMask}
                        onImageUpload={handleCanvasImageUpload}
                        inpaintFullRes={inpaintFullRes}
                        inpaintFullResPadding={inpaintFullResPadding}
                        setInpaintFullResPadding={setInpaintFullResPadding}
                        forceEditMode={forceInpaintEditMode}
                    />
                ) : (
                    <Canvas
                        currentImage={currentImage}
                        previewImage={getGenerationImageUrl(timeline.currentPreview)}
                        livePreview={livePreview}
                        loading={loading}
                        progress={progress}
                        generationWidth={width}
                        generationHeight={height}
                        prompt={prompt}
                        setPrompt={setPrompt}
                        negativePrompt={negativePrompt}
                        setNegativePrompt={setNegativePrompt}
                        generationMode={generationMode}
                        inputImage={generationMode === "img2img" ? inputImage : null}
                        onImageUpload={generationMode === "img2img" ? handleCanvasImageUpload : null}
                    />
                )}

                {/* Right Properties Panel */}
                <PropertiesPanel
                    collapsed={propertiesCollapsed}
                    onToggle={() => setPropertiesCollapsed(!propertiesCollapsed)}
                    // Generation settings
                    generationMode={generationMode}
                    setGenerationMode={setGenerationMode}
                    models={models}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    samplers={samplers}
                    selectedSampler={selectedSampler}
                    setSelectedSampler={setSelectedSampler}
                    steps={steps}
                    setSteps={setSteps}
                    cfgScale={cfgScale}
                    setCfgScale={setCfgScale}
                    width={width}
                    setWidth={setWidth}
                    height={height}
                    setHeight={setHeight}
                    batchSize={batchSize}
                    setBatchSize={setBatchSize}
                    count={count}
                    setCount={setCount}
                    denoisingStrength={denoisingStrength}
                    setDenoisingStrength={setDenoisingStrength}
                    inputImage={inputImage}
                    onImageUpload={handleCanvasImageUpload}
                    clipSkip={clipSkip}
                    onClipSkipChange={handleClipSkipChange}
                    saveImages={saveImages}
                    setSaveImages={setSaveImages}
                    saveGrids={saveGrids}
                    setSaveGrids={setSaveGrids}
                    // Inpainting parameters
                    inpaintMask={inpaintMask}
                    setInpaintMask={setInpaintMask}
                    maskBlur={maskBlur}
                    setMaskBlur={setMaskBlur}
                    inpaintingFill={inpaintingFill}
                    setInpaintingFill={setInpaintingFill}
                    inpaintFullRes={inpaintFullRes}
                    setInpaintFullRes={setInpaintFullRes}
                    inpaintingMaskInvert={inpaintingMaskInvert}
                    setInpaintingMaskInvert={setInpaintingMaskInvert}
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
