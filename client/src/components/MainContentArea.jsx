import { useState, useEffect, useMemo, useRef } from "react";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import api from "../api";
import { useWebSocketProgress } from "../hooks/useWebSocketProgress";
import Sidebar from "./Sidebar.jsx";
import InpaintCanvas from "./InpaintCanvas/components/InpaintCanvas.jsx";
import PropertiesPanel from "./PropertiesPanel.jsx";
import UpscaleDialog from "./UpscaleDialog.jsx";
import WorkspaceBrowser from "./WorkspaceBrowser.jsx";
import { composePromptsFromNodes } from "./PromptComposer/utils/promptUtils";
import { encodeLegacy } from "./PromptComposer/utils/legacyEncoding";
import { parseWorkspaceImage, resolveImageSrc, API_BASE_URL } from "../lib/utils";

const MainContentArea = ({
    workspaceName,
    isActive,
    onClipSkipChange,
    onInterrupt,
    onSelectWorkspace,
    workspaceBrowserOpen,
    setWorkspaceBrowserOpen,
}) => {
    // Add error handling
    try {
        const { getWorkspaceState, updateWorkspaceState, initializeWorkspaceState } = useWorkspaceState();
        const workspaceState = getWorkspaceState(workspaceName);

        // Local state for components that need it
        const [loading, setLoading] = useState(false);
        const [currentTaskId, setCurrentTaskId] = useState(null);
        const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
        const [pendingRestart, setPendingRestart] = useState(false);
        const [workspacePromptLoaded, setWorkspacePromptLoaded] = useState(false);
        const [forceInpaintEditMode, setForceInpaintEditMode] = useState(false);
        const [preserveInpaintMask, setPreserveInpaintMask] = useState(false);

        // Refs for managing state changes
        const programmaticComposerUpdateRef = useRef(false);
        const workspaceChangingRef = useRef(false);

        // WebSocket progress tracking
        const { progress, isConnected, livePreview } = useWebSocketProgress(currentTaskId);

        // Upscale dialog state
        const [upscaleDialog, setUpscaleDialog] = useState({
            isOpen: false,
            sourceImage: null,
            selectedUpscaler: "Lanczos",
            availableUpscalers: [],
            loading: false,
            error: null,
        });

        // Initialize workspace state when workspaceName changes
        useEffect(() => {
            if (workspaceName) {
                initializeWorkspaceState(workspaceName);
            }
        }, [workspaceName, initializeWorkspaceState]);

        // Load workspace data when workspace changes
        useEffect(() => {
            if (workspaceName) {
                loadWorkspaceData();
            }
        }, [workspaceName]);

        // Handle generation mode changes
        const handleGenerationModeChange = (mode) => {
            updateWorkspaceState(workspaceName, { generationMode: mode });
            // When switching to inpaint mode, force edit mode for mask editing
            if (mode === "inpaint") {
                setForceInpaintEditMode(true);
                // Reset after a short delay to allow the effect to take place
                setTimeout(() => setForceInpaintEditMode(false), 100);
                // If there's a current image, preserve existing mask for inpainting
                if (workspaceState?.currentImage) {
                    setPreserveInpaintMask(true);
                }
            } else {
                setForceInpaintEditMode(false);
                setPreserveInpaintMask(false);
            }
        };

        // Composer prompts computation
        const composerPrompts = useMemo(
            () => composePromptsFromNodes(workspaceState?.composerNodes || []),
            [workspaceState?.composerNodes]
        );
        const composerPrompt = composerPrompts.positive;
        const composerNegativePrompt = composerPrompts.negative;

        // Load workspace data
        const loadWorkspaceData = async () => {
            if (!workspaceName) return;

            try {
                workspaceChangingRef.current = true;

                // Load generations
                await loadWorkspaceGenerations();

                // Load prompt
                await loadWorkspacePrompt();

                setTimeout(() => {
                    workspaceChangingRef.current = false;
                }, 100);
            } catch (error) {
                console.error("Failed to load workspace data:", error);
                workspaceChangingRef.current = false;
            }
        };

        const loadWorkspaceGenerations = async () => {
            if (!workspaceName) return;

            try {
                const generations = await api.getGenerations(workspaceName);

                // Separate generations by status
                const generationQueue = generations.filter(gen => gen.status === 'candidate');
                const committedHistory = generations.filter(gen => gen.status === 'commit');
                const discarded = generations.filter(gen => gen.status === 'reject');

                // Set the latest committed image as the current canvas image
                const currentImage = committedHistory.length > 0
                    ? getGenerationImageUrl(committedHistory[0], 'full')
                    : null;

                updateWorkspaceState(workspaceName, {
                    timeline: {
                        generationQueue,
                        currentPreview: generationQueue.length > 0 ? generationQueue[0] : null,
                        committedHistory,
                        discarded,
                    },
                    currentImage,
                });
            } catch (error) {
                console.error("Failed to load workspace generations:", error);
                updateWorkspaceState(workspaceName, {
                    timeline: {
                        generationQueue: [],
                        currentPreview: null,
                        committedHistory: [],
                        discarded: [],
                    },
                    currentImage: null,
                });
            }
        };

        const loadWorkspacePrompt = async () => {
            if (!workspaceName) {
                setWorkspacePromptLoaded(true);
                return;
            }

            setWorkspacePromptLoaded(false);
            try {
                const workspacePrompt = await api.getWorkspacePrompt(workspaceName);
                const nodes = workspacePrompt.nodes || [];
                programmaticComposerUpdateRef.current = true;
                updateWorkspaceState(workspaceName, { composerNodes: nodes });
            } catch (error) {
                console.error("Failed to load workspace prompt:", error);
            } finally {
                setWorkspacePromptLoaded(true);
            }
        };

        // Save workspace prompt when composer nodes change
        useEffect(() => {
            if (!workspaceName || !workspacePromptLoaded || workspaceChangingRef.current) return;
            if (programmaticComposerUpdateRef.current) {
                programmaticComposerUpdateRef.current = false;
                return;
            }
            const payload = {
                nodes: workspaceState?.composerNodes || [],
            };
            const timer = setTimeout(() => {
                api.saveWorkspacePrompt(workspaceName, payload).catch((error) => {
                    console.error("Failed to save workspace prompt:", error);
                });
            }, 500);
            return () => clearTimeout(timer);
        }, [workspaceState?.composerNodes, workspaceName, workspacePromptLoaded]);

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

        // Generation logic
        const generateImage = async () => {
            setPendingRestart(false);
            if (!composerPrompt.trim()) return;
            if ((workspaceState?.generationMode === "img2img" || workspaceState?.generationMode === "inpaint") &&
                workspaceState?.timeline.committedHistory.length === 0) {
                alert("No committed images available for img2img/inpainting. Please generate and commit an image first.");
                return;
            }
            if (workspaceState?.generationMode === "inpaint" && !workspaceState?.inpaintMask) {
                alert("Please draw or upload a mask for inpainting mode.");
                return;
            }

            if (!workspaceName) {
                alert("Workspace not initialized yet. Please wait a moment and try again.");
                return;
            }

            setLoading(true);
            setCurrentTaskId(null);
            sessionStorage.removeItem('currentTaskId');

            // Generate task ID
            let taskId = sessionStorage.getItem('currentTaskId');
            if (!taskId) {
                taskId = `task(${workspaceState?.generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`;
                sessionStorage.setItem('currentTaskId', taskId);
            }

            setCurrentTaskId(taskId);

            // Wait a bit for WebSocket connection to establish
            await new Promise((resolve) => setTimeout(resolve, 100));

            try {
                // Inject prompt composer metadata
                let promptWithMetadata = composerPrompt;
                if (workspaceState?.composerNodes?.length > 0) {
                    try {
                        const encodedData = encodeLegacy(workspaceState.composerNodes);
                        promptWithMetadata += `\n\n\n\n\n<betterpromptexport:${encodedData}>`;
                    } catch (e) {
                        console.warn('Failed to encode prompt metadata for generation:', e);
                    }
                }

                const baseParams = {
                    prompt: promptWithMetadata,
                    negative_prompt: composerNegativePrompt,
                    steps: workspaceState?.steps || 20,
                    width: workspaceState?.width || 512,
                    height: workspaceState?.height || 512,
                    cfg_scale: workspaceState?.cfgScale || 7,
                    sampler_name: workspaceState?.selectedSampler || 'Euler a',
                    batch_size: workspaceState?.batchSize || 1,
                    n_iter: workspaceState?.count || 1,
                    clip_skip: workspaceState?.clipSkip || 1,
                    save_images: true, // TODO: make this configurable
                    force_task_id: taskId,
                    workspace_name: workspaceName,
                };

                let data;
                if (workspaceState?.generationMode === "img2img") {
                    const img2imgParams = {
                        ...baseParams,
                        genid: workspaceState.timeline.committedHistory[0].genid,
                        denoising_strength: workspaceState?.denoisingStrength || 0.75,
                    };
                    data = await api.img2img(img2imgParams);
                } else if (workspaceState?.generationMode === "inpaint") {
                    const maskBase64Data = workspaceState.inpaintMask.split(",")[1];
                    const inpaintParams = {
                        ...baseParams,
                        genid: workspaceState.timeline.committedHistory[0].genid,
                        mask: maskBase64Data,
                        mask_blur: workspaceState?.maskBlur || 4,
                        inpainting_fill: workspaceState?.inpaintingFill || 0,
                        inpaint_full_res: workspaceState?.inpaintFullRes ?? true,
                        inpaint_full_res_padding: workspaceState?.inpaintFullResPadding || 64,
                        inpainting_mask_invert: workspaceState?.inpaintingMaskInvert ? 1 : 0,
                        denoising_strength: workspaceState?.denoisingStrength || 0.75,
                    };
                    data = await api.img2img(inpaintParams);
                } else {
                    data = await api.txt2img(baseParams);
                }

                if ((data.filesystem_paths && data.filesystem_paths.length > 0) || (data.images && data.images.length > 0)) {
                    console.log("Loading workspace generations...");
                    await loadWorkspaceGenerations();
                    console.log("Workspace generations loaded");
                }
            } catch (error) {
                console.error("Error generating image:", error);
                handleGenerationError(error);
            } finally {
                resetGenerationState();
            }
        };

        const handleGenerationError = (error) => {
            if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("404")) {
                if (workspaceState?.generationMode === "inpaint" || workspaceState?.generationMode === "img2img") {
                    alert("Failed to load input image. The image may no longer be available. Please select a different input image.");
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
        };

        const resetGenerationState = () => {
            setLoading(false);
            setCurrentTaskId(null);
            sessionStorage.removeItem('currentTaskId');
        };

        const handleCanvasImageUpload = async (imageSrc) => {
            if (!workspaceName) return;
            try {
                const result = await api.importWorkspaceImage(workspaceName, imageSrc);
                const workspaceImage = `workspace://${workspaceName}/${result.image_path}`;

                // Extract genid from the path
                const pathParts = result.image_path.split('/');
                const genid = pathParts.length >= 2 ? pathParts[1] : 'unknown';

                // Create a Generation object for the uploaded image
                const uploadedGeneration = {
                    genid,
                    status: 'candidate',
                    timestamp: Date.now(),
                    source: 'upload',
                    workspace: workspaceName,
                    prompt: 'Uploaded image',
                    negativePrompt: '',
                    parameters: {}
                };

                // Immediately commit the uploaded image
                await api.commitWorkspaceImage(workspaceName, `candidates/${genid}/full.png`);

                // Update the uploaded generation to reflect it's now committed
                const committedGeneration = { ...uploadedGeneration, status: 'commit' };

                const currentTimeline = workspaceState?.timeline || {
                    generationQueue: [],
                    currentPreview: null,
                    committedHistory: [],
                    discarded: [],
                };

                updateWorkspaceState(workspaceName, {
                    timeline: {
                        ...currentTimeline,
                        committedHistory: [committedGeneration, ...currentTimeline.committedHistory],
                    },
                    currentImage: getGenerationImageUrl(committedGeneration, 'full'),
                });
            } catch (error) {
                console.error("Failed to import image to workspace:", error);
            }
        };

        // Preview and commit handlers
        const handlePreviewSelect = (generation) => {
            updateWorkspaceState(workspaceName, {
                timeline: {
                    ...workspaceState?.timeline,
                    currentPreview: generation,
                }
            });
        };

        const handleRejectPreview = async () => {
            const preview = workspaceState?.timeline?.currentPreview;
            if (!preview) return;

            try {
                await api.rejectWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.png`);
                await loadWorkspaceGenerations();
            } catch (error) {
                console.error("Failed to reject generation:", error);
            }
        };

        const handleCommitPreview = async () => {
            const preview = workspaceState?.timeline?.currentPreview;
            if (!preview) return;

            try {
                // Reject all other candidates
                const otherCandidates = workspaceState?.timeline?.generationQueue.filter(gen => gen.genid !== preview.genid) || [];
                for (const candidate of otherCandidates) {
                    try {
                        await api.rejectWorkspaceImage(candidate.workspace, `candidates/${candidate.genid}/full.png`);
                    } catch (error) {
                        console.error(`Failed to reject candidate ${candidate.genid}:`, error);
                    }
                }

                // Commit the selected preview
                await api.commitWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.png`);
                await loadWorkspaceGenerations();

                // Update current image
                const committedImageUrl = getGenerationImageUrl({ ...preview, status: 'commit' });
                updateWorkspaceState(workspaceName, { currentImage: committedImageUrl });

                if (workspaceState?.generationMode === "inpaint") {
                    setPreserveInpaintMask(true);
                }
            } catch (error) {
                console.error("Failed to commit generation:", error);
            }
        };

        // Other timeline handlers
        const handleDiscardGeneration = async (generation) => {
            try {
                await api.deleteWorkspaceImage(generation.workspace, `${generation.status === 'candidate' ? 'candidates' : generation.status === 'commit' ? 'commits' : 'rejects'}/${generation.genid}/full.png`);
                await loadWorkspaceGenerations();
            } catch (error) {
                console.error("Failed to delete generation:", error);
            }
        };

        const handleRestoreGeneration = async (generation) => {
            try {
                await api.restoreWorkspaceImage(generation.workspace, `${generation.status === 'reject' ? 'rejects' : 'commits'}/${generation.genid}/full.png`);
                await loadWorkspaceGenerations();
            } catch (error) {
                console.error("Failed to restore generation:", error);
            }
        };

        const handleUncommitGeneration = async (generation) => {
            try {
                await api.uncommitWorkspaceImage(generation.workspace, `commits/${generation.genid}/full.png`);
                await loadWorkspaceGenerations();
            } catch (error) {
                console.error("Failed to uncommit generation:", error);
            }
        };

        // Upscale functionality
        const handleOpenUpscaleDialog = (sourceImage) => {
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
            if (sourceImage && sourceImage.genid && sourceImage.workspace) {
                const category = sourceImage.status === 'commit' ? 'commits'
                    : sourceImage.status === 'reject' ? 'rejects'
                        : 'candidates';
                return `${category}/${sourceImage.genid}/full.png`;
            }

            if (sourceImage && sourceImage.type === 'canvas') {
                if (workspaceState?.currentImage) {
                    const workspaceInfo = parseWorkspaceImage(workspaceState.currentImage);
                    if (workspaceInfo) {
                        const pathParts = workspaceInfo.path.split('/');
                        if (pathParts.length >= 2 && ['candidates', 'commits', 'rejects'].includes(pathParts[0])) {
                            const category = pathParts[0];
                            const genid = pathParts[1];
                            return `${category}/${genid}/full.png`;
                        }
                    }
                }

                if (workspaceState?.timeline?.committedHistory.length > 0) {
                    const latestCommit = workspaceState.timeline.committedHistory[0];
                    return `commits/${latestCommit.genid}/full.png`;
                }
            }

            return null;
        };

        const handleUpscale = async (upscaler, scaleFactor) => {
            if (!upscaleDialog.sourceImage) return;

            setUpscaleDialog((prev) => ({
                ...prev,
                loading: true,
                error: null,
            }));

            try {
                if (!workspaceName) {
                    throw new Error("Workspace not initialized");
                }

                const workspaceImagePath = getWorkspaceImagePath(upscaleDialog.sourceImage);

                const params = {
                    upscaler_1: upscaler,
                    upscaling_resize: scaleFactor,
                    resize_mode: 0,
                    show_extras_results: true,
                    workspace_name: workspaceName,
                };

                if (workspaceImagePath) {
                    params.workspace_image_path = workspaceImagePath;
                } else {
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

                if (result.generation) {
                    const currentTimeline = workspaceState?.timeline || {
                        generationQueue: [],
                        currentPreview: null,
                        committedHistory: [],
                        discarded: [],
                    };

                    updateWorkspaceState(workspaceName, {
                        timeline: {
                            ...currentTimeline,
                            generationQueue: [result.generation, ...currentTimeline.generationQueue],
                            currentPreview: result.generation,
                        },
                    });
                }

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

        const handleComposerNodesChange = (nodes) => {
            updateWorkspaceState(workspaceName, { composerNodes: nodes });
        };

        const handleRefreshCanvas = () => {
            setCanvasRefreshKey(prev => prev + 1);
        };

        const handleRestart = () => {
            if (!loading) return;
            setPendingRestart(true);
            onInterrupt();
        };

        const handleEnd = () => {
            if (pendingRestart) {
                setPendingRestart(false);
            }
            onInterrupt();
        };

        // Handle pending restart
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

        // Reset canvas refresh key when currentImage changes
        useEffect(() => {
            setCanvasRefreshKey(0);
        }, [workspaceState?.currentImage]);


        if (!workspaceState) {
            return (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-studio-textSecondary">Loading workspace {workspaceName}...</div>
                </div>
            );
        }

        return (
            <div
                className="absolute inset-0 flex overflow-hidden"
                style={{
                    visibility: isActive ? 'visible' : 'hidden'
                }}
            >
                {/* Left Sidebar */}
                <Sidebar
                    collapsed={false} // TODO: make this configurable per workspace
                    onToggle={() => { }} // TODO: implement sidebar collapse
                    timeline={workspaceState.timeline}
                    currentImage={workspaceState.currentImage}
                    onPreviewSelect={handlePreviewSelect}
                    onCommitPreview={handleCommitPreview}
                    onRejectPreview={handleRejectPreview}
                    onDiscardGeneration={handleDiscardGeneration}
                    onRestoreGeneration={handleRestoreGeneration}
                    onUncommitGeneration={handleUncommitGeneration}
                    onGenerationModeChange={handleGenerationModeChange}
                    generationMode={workspaceState.generationMode}
                    onUpscale={handleOpenUpscaleDialog}
                    getGenerationImageUrl={getGenerationImageUrl}
                    onRefreshTimeline={() => loadWorkspaceGenerations()}
                    onRefreshCanvas={handleRefreshCanvas}
                    canvasRefreshKey={canvasRefreshKey}
                />

                {/* Main Canvas Area */}
                {workspaceState.generationMode === "inpaint" ? (
                    <InpaintCanvas
                        currentImage={workspaceState.currentImage}
                        previewImage={getGenerationImageUrl(workspaceState.timeline.currentPreview, "preview")}
                        livePreview={livePreview}
                        loading={loading}
                        progress={progress}
                        generationWidth={workspaceState.width}
                        generationHeight={workspaceState.height}
                        composerNodes={workspaceState.composerNodes}
                        onComposerNodesChange={handleComposerNodesChange}
                        inpaintMask={workspaceState.inpaintMask}
                        setInpaintMask={(mask) => updateWorkspaceState(workspaceName, { inpaintMask: mask })}
                        onImageUpload={handleCanvasImageUpload}
                        inpaintFullRes={workspaceState.inpaintFullRes}
                        inpaintFullResPadding={workspaceState.inpaintFullResPadding}
                        setInpaintFullResPadding={(padding) => updateWorkspaceState(workspaceName, { inpaintFullResPadding: padding })}
                        setInpaintFullRes={(fullRes) => updateWorkspaceState(workspaceName, { inpaintFullRes: fullRes })}
                        forceEditMode={forceInpaintEditMode}
                        maskBlur={workspaceState.maskBlur}
                        setMaskBlur={(blur) => updateWorkspaceState(workspaceName, { maskBlur: blur })}
                        inpaintingFill={workspaceState.inpaintingFill}
                        setInpaintingFill={(fill) => updateWorkspaceState(workspaceName, { inpaintingFill: fill })}
                        denoisingStrength={workspaceState.denoisingStrength}
                        setDenoisingStrength={(strength) => updateWorkspaceState(workspaceName, { denoisingStrength: strength })}
                        inpaintingMaskInvert={workspaceState.inpaintingMaskInvert}
                        setInpaintingMaskInvert={(invert) => updateWorkspaceState(workspaceName, { inpaintingMaskInvert: invert })}
                        canvasPadding={workspaceState.canvasPadding}
                        generationMode={workspaceState.generationMode}
                        canvasRefreshKey={canvasRefreshKey}
                    />
                ) : (
                    <InpaintCanvas
                        currentImage={workspaceState.currentImage}
                        previewImage={getGenerationImageUrl(workspaceState.timeline.currentPreview, "preview")}
                        livePreview={livePreview}
                        loading={loading}
                        progress={progress}
                        generationWidth={workspaceState.width}
                        generationHeight={workspaceState.height}
                        composerNodes={workspaceState.composerNodes}
                        onComposerNodesChange={handleComposerNodesChange}
                        setInpaintMask={() => { }}
                        forceEditMode={false}
                        maskBlur={workspaceState.maskBlur}
                        setMaskBlur={(blur) => updateWorkspaceState(workspaceName, { maskBlur: blur })}
                        inpaintingFill={workspaceState.inpaintingFill}
                        setInpaintingFill={(fill) => updateWorkspaceState(workspaceName, { inpaintingFill: fill })}
                        denoisingStrength={workspaceState.denoisingStrength}
                        setDenoisingStrength={(strength) => updateWorkspaceState(workspaceName, { denoisingStrength: strength })}
                        setInpaintFullRes={() => { }}
                        inpaintingMaskInvert={workspaceState.inpaintingMaskInvert}
                        setInpaintingMaskInvert={(invert) => updateWorkspaceState(workspaceName, { inpaintingMaskInvert: invert })}
                        canvasPadding={workspaceState.canvasPadding}
                        onImageUpload={workspaceState.generationMode === "img2img" ? handleCanvasImageUpload : null}
                        inpaintFullRes={false}
                        inpaintFullResPadding={0}
                        setInpaintFullResPadding={() => { }}
                        generationMode={workspaceState.generationMode}
                        canvasRefreshKey={canvasRefreshKey}
                    />
                )}

                {/* Right Properties Panel */}
                <PropertiesPanel
                    collapsed={true} // TODO: make this configurable per workspace
                    onToggle={() => { }} // TODO: implement properties panel collapse
                    generationMode={workspaceState.generationMode}
                    setGenerationMode={(mode) => updateWorkspaceState(workspaceName, { generationMode: mode })}
                    batchSize={workspaceState.batchSize}
                    setBatchSize={(size) => updateWorkspaceState(workspaceName, { batchSize: size })}
                    denoisingStrength={workspaceState.denoisingStrength}
                    setDenoisingStrength={(strength) => updateWorkspaceState(workspaceName, { denoisingStrength: strength })}
                    inputImage={workspaceState.generationMode === "inpaint" ? workspaceState.currentImage : workspaceState.generationMode === "img2img" ? workspaceState.currentImage : null}
                    onImageUpload={handleCanvasImageUpload}
                    clipSkip={workspaceState.clipSkip}
                    onClipSkipChange={(clipSkip) => {
                        updateWorkspaceState(workspaceName, { clipSkip });
                        onClipSkipChange(clipSkip);
                    }}
                    saveImages={true} // TODO: make this configurable
                    setSaveImages={() => { }} // TODO: implement save images setting
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

                {/* Workspace Browser */}
                {workspaceBrowserOpen && (
                    <WorkspaceBrowser
                        currentWorkspace={workspaceName}
                        onSelectWorkspace={(name) => {
                            onSelectWorkspace(name);
                            setWorkspaceBrowserOpen(false);
                        }}
                        onClose={() => setWorkspaceBrowserOpen(false)}
                    />
                )}
            </div>
        );
    } catch (error) {
        console.error('Error in MainContentArea:', error);
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500">
                <div className="text-white text-center">
                    <div className="font-bold mb-2">Error in MainContentArea</div>
                    <div className="text-sm">{error.message}</div>
                    <div className="text-xs mt-2">Workspace: {workspaceName}</div>
                </div>
            </div>
        );
    }
};

export default MainContentArea;