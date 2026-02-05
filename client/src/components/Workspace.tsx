import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
import api from "../Api";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Sidebar from "./Sidebar";
import InpaintCanvas from "./InpaintCanvas/components/InpaintCanvas";
import UpscaleDialog from "./UpscaleDialog";
import { parseWorkspaceImage, resolveImageSrc, API_BASE_URL } from "../lib/utils";
import { composePromptsFromNodes } from "./PromptComposer/utils/promptUtils";
import { encodeLegacy } from "./PromptComposer/utils/legacyEncoding";
import { useWorkspaceContext, useWorkspaceState } from "../contexts/WorkspaceContext";
import { useWebSocketProgress } from "../hooks/useWebSocketProgress";
import type { Generation, ExtrasSingleImageParams } from "../Api";
import type { PromptMode, PromptNode, TagsNode } from "./PromptComposer/types";
import { generateId } from "./PromptComposer/utils/promptUtils";
import type { GenerationMode } from "../types/components";
import type { ProgressData } from "../hooks/useWebSocketProgress";
import type { Timeline } from "./TimelineItem";

const Workspace = ({ workspaceId, isActive }: {
    workspaceId: string;
    isActive: boolean;
}) => {
    const {
        workspaceState,
        updateWorkspaceState,
    } = useWorkspaceState(workspaceId);
    const {
        models,
        setModels,
        setModules,
        samplers,
        setSamplers
    } = useWorkspaceContext();

    const { generation, mode, ui, canvas } = workspaceState;

    // Separate state for composer nodes (not part of workspace state syncing)
    const [composerNodes, setComposerNodes] = useState<PromptNode[]>([]);

    // Separate state for timeline (not part of workspace state syncing)
    const [timeline, setTimeline] = useState<Timeline>({
        generationQueue: [],
        currentPreview: null,
        committedHistory: [],
        discarded: [],
    });
    const generationQueue = timeline.generationQueue;
    const currentPreview = timeline.currentPreview;

    // Separate state for upscale dialog (not part of workspace state syncing)
    const [upscaleDialog, setUpscaleDialog] = useState({
        isOpen: false,
        sourceImage: null as { id: string; image: string; type: "timeline" | "canvas" } | null,
        selectedUpscaler: "Lanczos",
        availableUpscalers: [] as Array<{ name: string; model_name?: string; scale?: number }>,
        loading: false,
        error: null as string | null,
    });

    const [timelapseVideoUrl, setTimelapseVideoUrl] = useState<string | null>(null);

    const composerPrompts = useMemo(
        () => composePromptsFromNodes(composerNodes),
        [composerNodes]
    );
    const composerPrompt = composerPrompts.positive;
    const composerNegativePrompt = composerPrompts.negative;
    const programmaticComposerUpdateRef = useRef(false);
    const workspaceChangingRef = useRef(false);
    const promptLoadedRef = useRef(false);

    const { progress: progressData, livePreview } = useWebSocketProgress(generation.currentTaskId);
    const progress: ProgressData | null = progressData;

    const setGenerationState = useCallback((updates: Partial<typeof generation>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            generation: { ...prev.generation, ...updates },
        }));
    }, [updateWorkspaceState]);

    const setModeState = useCallback((updates: Partial<typeof mode>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            mode: { ...prev.mode, ...updates },
        }));
    }, [updateWorkspaceState]);

    const setUiState = useCallback((updates: Partial<typeof ui>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            ui: { ...prev.ui, ...updates },
        }));
    }, [updateWorkspaceState]);

    const handlePromptModeChange = useCallback((mode: PromptMode) => {
        setUiState({ promptMode: mode });
    }, [setUiState]);

    const setCanvasState = useCallback((updates: Partial<typeof canvas>) => {
        updateWorkspaceState((prev) => ({
            ...prev,
            canvas: { ...prev.canvas, ...updates },
        }));
    }, [updateWorkspaceState]);

    const setTimelineState = useCallback((updater: (prev: Timeline) => Timeline) => {
        setTimeline(updater);
    }, []);

    const resetGenerationState = useCallback((): void => {
        setGenerationState({
            loading: false,
            currentTaskId: null,
        });
        sessionStorage.removeItem("currentTaskId");
    }, [setGenerationState]);

    const getGenerationImageUrl = useCallback((
        generationItem: Generation | null,
        size: "preview" | "full" = "full"
    ): string | null => {
        if (!generationItem) return null;
        const asset = size === "preview" ? "512.webp" : "full.webp";
        const category = generationItem.status === "commit"
            ? "commits"
            : generationItem.status === "reject"
                ? "rejects"
                : "candidates";
        return `${API_BASE_URL}/api/workspaces/${encodeURIComponent(generationItem.workspace)}/${category}/${generationItem.genid}/${asset}`;
    }, []);

    const loadWorkspaceGenerations = useCallback(async (): Promise<void> => {
        if (!workspaceId) return;
        try {
            const generations = await api.getGenerations(workspaceId);
            const generationQueue = generations.filter((gen) => gen.status === "candidate");
            const committedHistory = generations.filter((gen) => gen.status === "commit");
            const discarded = generations.filter((gen) => gen.status === "reject");

            const latestCommit = committedHistory.length > 0 ? committedHistory[0] : null;
            if (latestCommit) {
                setCanvasState({
                    currentImage: getGenerationImageUrl(latestCommit, "full"),
                });
            }

            setTimelineState(() => ({
                generationQueue,
                currentPreview: generationQueue.length > 0 ? generationQueue[0] : null,
                committedHistory,
                discarded,
            }));
        } catch (error) {
            console.error("Failed to load workspace generations:", error);
            setTimelineState(() => ({
                generationQueue: [],
                currentPreview: null,
                committedHistory: [],
                discarded: [],
            }));
        }
    }, [getGenerationImageUrl, setCanvasState, setTimelineState, workspaceId]);

    const loadWorkspacePrompt = useCallback(async (): Promise<void> => {
        if (!workspaceId) {
            return;
        }

        let nodes: PromptNode[] = [];
        try {
            const workspacePrompt = await api.getWorkspacePrompt(workspaceId);
            nodes = workspacePrompt.nodes || [];

            if (nodes.length === 0) {
                const defaultTagNode: TagsNode = {
                    id: generateId(),
                    type: 'tags',
                    name: 'Tags',
                    hidden: false,
                    weight: 1,
                    value: [{ value: '', weight: 1 }]
                };
                nodes = [defaultTagNode];
            }

            programmaticComposerUpdateRef.current = true;
            promptLoadedRef.current = true;
        } catch (error) {
            console.error("Failed to load workspace prompt:", error);
        } finally {
            setComposerNodes(nodes);
        }
    }, [workspaceId]);

    const maskSnapshotProviderRef = useRef<(() => string | null) | null>(null);

    const handleRegisterMaskSnapshotProvider = useCallback((provider: (() => string | null) | null) => {
        maskSnapshotProviderRef.current = provider;
    }, []);

    const handleBeforeGenerate = useCallback(() => {
        console.log("handleBeforeGenerate", mode);
        if (mode.generationMode !== "inpaint") {
            console.error("Generation mode is not inpaint");
            return;
        }
        const provider = maskSnapshotProviderRef.current;
        if (!provider) {
            console.error("No mask snapshot provider found");
            return;
        }
        const snapshot = provider();
        setModeState({ inpaintMaskSnapshot: snapshot ?? null });
    }, [mode.generationMode, setModeState]);

    const handleGenerationModeChange = (nextMode: GenerationMode): void => {
        setModeState({ generationMode: nextMode });
        if (nextMode === "inpaint") {
            setModeState({ forceInpaintEditMode: true });
            setTimeout(() => setModeState({ forceInpaintEditMode: false }), 100);
            if (canvas.currentImage) {
                setGenerationState({ inputImage: canvas.currentImage });
            }
        } else {
            setModeState({ forceInpaintEditMode: false });
        }
    };

    const handleRefreshCanvas = async (): Promise<void> => {
        if (!workspaceId || !canvas.currentImage) return;

        const workspaceInfo = parseWorkspaceImage(canvas.currentImage);
        if (workspaceInfo && workspaceInfo.path) {
            try {
                await api.refreshGenerationFromSource(workspaceId, workspaceInfo.path);
            } catch (error) {
                console.error("Failed to refresh generation from source:", error);
            }
        }

        updateWorkspaceState((prev) => ({
            ...prev,
            canvas: {
                ...prev.canvas,
                canvasRefreshKey: prev.canvas.canvasRefreshKey + 1,
            },
        }));
    };

    const handleEditCanvas = async (): Promise<void> => {
        if (!workspaceId || !canvas.currentImage) return;
        const workspaceInfo = parseWorkspaceImage(canvas.currentImage);
        if (workspaceInfo && workspaceInfo.path) {
            try {
                await api.revealWorkspacePath(workspaceId, workspaceInfo.path);
            } catch (error) {
                console.error("Failed to reveal workspace path:", error);
            }
        }
    };

    const generateImage = useCallback(async (): Promise<void> => {
        setGenerationState({ pendingRestart: false });
        if (!composerPrompt.trim()) return;
        if (mode.generationMode === "inpaint") {
            handleBeforeGenerate();
        }
        if ((mode.generationMode === "img2img" || mode.generationMode === "inpaint") && timeline.committedHistory.length === 0) {
            alert("No committed images available for img2img/inpainting. Please generate and commit an image first.");
            return;
        }
        if (mode.generationMode === "inpaint" && !mode.inpaintMask) {
            alert("Please draw or upload a mask for inpainting mode.");
            return;
        }

        if (!workspaceId) {
            alert("Workspace not initialized yet. Please wait a moment and try again.");
            return;
        }

        setGenerationState({ loading: true, currentTaskId: null });
        sessionStorage.removeItem("currentTaskId");

        let taskId = sessionStorage.getItem("currentTaskId");
        if (!taskId) {
            taskId = `task(${mode.generationMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`;
            sessionStorage.setItem("currentTaskId", taskId);
        }

        setGenerationState({ currentTaskId: taskId });
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            let promptWithMetadata = composerPrompt;
            if (composerNodes.length > 0) {
                try {
                    const encodedData = encodeLegacy(composerNodes);
                    promptWithMetadata += `\n\n\n\n\n<betterpromptexport:${encodedData}>`;
                } catch (e) {
                    console.warn("Failed to encode prompt metadata for generation:", e);
                }
            }

            const baseParams = {
                prompt: promptWithMetadata,
                negative_prompt: composerNegativePrompt,
                steps: generation.steps,
                width: generation.width,
                height: generation.height,
                cfg_scale: generation.cfgScale,
                sampler_name: generation.selectedSampler,
                batch_size: generation.batchSize,
                n_iter: generation.count,
                clip_skip: generation.clipSkip,
                save_images: generation.saveImages,
                force_task_id: taskId,
                workspace_name: workspaceId,
            };

            let data;
            if (mode.generationMode === "img2img") {
                const img2imgParams = {
                    ...baseParams,
                    genid: timeline.committedHistory[0].genid,
                    source_genid: timeline.committedHistory[0].genid,
                    denoising_strength: generation.denoisingStrength,
                };
                data = await api.img2img(img2imgParams);
            } else if (mode.generationMode === "inpaint") {
                const maskBase64Data = mode.inpaintMask!.split(",")[1];
                const inpaintParams = {
                    ...baseParams,
                    genid: timeline.committedHistory[0].genid,
                    source_genid: timeline.committedHistory[0].genid,
                    mask: maskBase64Data,
                    mask_blur: mode.maskBlur,
                    inpainting_fill: mode.inpaintingFill,
                    inpaint_full_res: mode.inpaintFullRes,
                    inpaint_full_res_padding: mode.inpaintFullResPadding,
                    inpainting_mask_invert: mode.inpaintingMaskInvert ? 1 : 0,
                    denoising_strength: generation.denoisingStrength,
                    return_partial_candidates: mode.returnPartialCandidates,
                };
                data = await api.img2img(inpaintParams);
            } else {
                data = await api.txt2img(baseParams);
            }

            if ((data.filesystem_paths && data.filesystem_paths.length > 0) || (data.images && data.images.length > 0)) {
                await loadWorkspaceGenerations();
            }
        } catch (error) {
            console.error("Error generating image:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || errorMessage.includes("404")) {
                if (mode.generationMode === "inpaint" || mode.generationMode === "img2img") {
                    alert("Failed to load input image. The image may no longer be available. Please select a different input image.");
                    setGenerationState({ inputImage: null });
                } else {
                    alert("Network error occurred. Please check your connection and try again.");
                }
            } else if (errorMessage.includes("CORS")) {
                alert("CORS error occurred. This may be due to browser security restrictions.");
            } else if (errorMessage.includes("interrupted") || errorMessage.includes("interrupt")) {
                alert("Generation was interrupted. Please try again.");
            } else {
                alert("Error generating image. Make sure the API server is running on port 7861.");
            }
            resetGenerationState();
        } finally {
            resetGenerationState();
        }
    }, [
        timeline.committedHistory,
        composerNegativePrompt,
        composerPrompt,
        generation.batchSize,
        generation.cfgScale,
        generation.clipSkip,
        generation.count,
        generation.denoisingStrength,
        generation.height,
        generation.saveImages,
        generation.selectedSampler,
        generation.steps,
        generation.width,
        loadWorkspaceGenerations,
        mode.generationMode,
        mode.inpaintFullRes,
        mode.inpaintFullResPadding,
        mode.inpaintMask,
        mode.inpaintingFill,
        mode.inpaintingMaskInvert,
        mode.maskBlur,
        resetGenerationState,
        setGenerationState,
        composerNodes,
        workspaceId,
        handleBeforeGenerate,
    ]);

    const loadInitialData = useCallback(async (): Promise<void> => {
        try {
            const [modelsData, modulesData, samplersData, optionsData] = await Promise.all([
                api.getModels(),
                api.getModules(),
                api.getSamplers(),
                api.getOptions(),
            ]);

            setModels(modelsData);
            setModules(modulesData);
            setSamplers(samplersData);

            const currentModelTitle = optionsData.sd_model_checkpoint;
            if (currentModelTitle) {
                const currentModel = modelsData.find((model) => model.title === currentModelTitle);
                if (currentModel) {
                    setGenerationState({ selectedModel: currentModel.title });
                } else {
                    const hashMatch = typeof currentModelTitle === "string" ? currentModelTitle.match(/\[([a-f0-9]+)\]$/) : null;
                    if (hashMatch) {
                        const hash = hashMatch[1];
                        const fallbackModel = modelsData.find(
                            (model) => model.hash === hash || model.title.includes(hash)
                        );
                        if (fallbackModel) {
                            setGenerationState({ selectedModel: fallbackModel.title });
                        } else if (modelsData.length > 0) {
                            setGenerationState({ selectedModel: modelsData[0].title });
                        }
                    } else if (modelsData.length > 0) {
                        setGenerationState({ selectedModel: modelsData[0].title });
                    }
                }
            } else if (modelsData.length > 0) {
                setGenerationState({ selectedModel: modelsData[0].title });
            }

            const currentClipSkip = optionsData.CLIP_stop_at_last_layers;
            if (currentClipSkip !== undefined && currentClipSkip !== null) {
                setGenerationState({ clipSkip: parseInt(currentClipSkip as string) });
            }

            const currentModules = optionsData.forge_additional_modules as string[];
            if (currentModules && Array.isArray(currentModules) && currentModules.length > 0) {
                // Find the module object that matches the filename (or just use the filename if that's what the option stores)
                // The option stores full paths or filenames.
                // Let's try to match with modulesData
                // For now, just take the first one and try to match it to a module name or filename
                const firstModule = currentModules[0];
                const matchedModule = modulesData.find(m => m.filename === firstModule || m.model_name === firstModule);
                if (matchedModule) {
                    setGenerationState({ selectedVAE: matchedModule.model_name });
                } else {
                    // Fallback: just use the name from the path if possible
                    const name = firstModule.split(/[/\\]/).pop();
                    setGenerationState({ selectedVAE: name || "Automatic" });
                }
            } else {
                setGenerationState({ selectedVAE: "Automatic" });
            }

        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    }, [setGenerationState, setModels, setModules, setSamplers]);

    const composerNodesSignature = useMemo(() => JSON.stringify(composerNodes), [composerNodes]);

    const handleComposerNodesChange = (nodes: PromptNode[]): void => {
        const nextSignature = JSON.stringify(nodes);
        if (nextSignature === composerNodesSignature) return;
        setComposerNodes(nodes);
    };

    const handleInpaintMaskChange = useCallback((value: SetStateAction<string | null>) => {
        updateWorkspaceState((prev) => {
            const nextValue = typeof value === "function"
                ? value(prev.mode.inpaintMask)
                : value;
            if (nextValue === prev.mode.inpaintMask) {
                return prev;
            }
            return {
                ...prev,
                mode: {
                    ...prev.mode,
                    inpaintMask: nextValue,
                },
            };
        });
    }, [updateWorkspaceState]);

    const noopSetInpaintMask = useCallback(() => { }, []);

    useEffect(() => {
        if (!workspaceId) return;
        workspaceChangingRef.current = true;
        promptLoadedRef.current = false;
        setCanvasState({ currentImage: null });
        setGenerationState({ inputImage: null });
        setComposerNodes([]);
        setTimelineState(() => ({
            generationQueue: [],
            currentPreview: null,
            committedHistory: [],
            discarded: [],
        }));
        void loadWorkspaceGenerations();
        void loadWorkspacePrompt();
        setTimeout(() => {
            workspaceChangingRef.current = false;
        }, 100);
    }, [workspaceId, loadWorkspaceGenerations, loadWorkspacePrompt, setCanvasState, setGenerationState, setTimelineState]);

    useEffect(() => {
        return () => {
            maskSnapshotProviderRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!workspaceId || workspaceChangingRef.current) return;
        if (mode.generationMode !== "inpaint") return;
        if (!canvas.currentImage || generation.inputImage) return;
        setModeState({ forceInpaintEditMode: true });
        const timer = setTimeout(() => setModeState({ forceInpaintEditMode: false }), 100);
        setGenerationState({ inputImage: canvas.currentImage });
        return () => clearTimeout(timer);
    }, [
        canvas.currentImage,
        generation.inputImage,
        mode.generationMode,
        setGenerationState,
        setModeState,
        workspaceId,
    ]);

    useEffect(() => {
        // Always consume the programmatic update flag, even if we return early later.
        // This prevents the flag from lingering and blocking the first valid user change.
        if (programmaticComposerUpdateRef.current) {
            programmaticComposerUpdateRef.current = false;
            return;
        }

        if (!workspaceId || workspaceChangingRef.current) return;
        if (!promptLoadedRef.current) return;

        const payload = { nodes: composerNodes };
        const timer = setTimeout(() => {
            api.saveWorkspacePrompt(workspaceId, payload).catch((error) => {
                console.error("Failed to save workspace prompt:", error);
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [composerNodes, workspaceId]);

    useEffect(() => {
        setCanvasState({ canvasRefreshKey: 0 });
    }, [canvas.currentImage, setCanvasState]);

    useEffect(() => {
        if (!generation.loading && generation.pendingRestart) {
            if (!composerPrompt.trim()) {
                setGenerationState({ pendingRestart: false });
                return;
            }
            setGenerationState({ pendingRestart: false });
            void generateImage();
        }
    }, [composerPrompt, generateImage, generation.loading, generation.pendingRestart, setGenerationState]);

    useEffect(() => {
        if (!generation.loading && mode.inpaintMaskSnapshot) {
            setModeState({ inpaintMaskSnapshot: null });
        }
    }, [generation.loading, mode.inpaintMaskSnapshot, setModeState]);

    useEffect(() => {
        if (!isActive) return;
        if (models.length > 0 || samplers.length > 0) return;
        void loadInitialData();
    }, [isActive, loadInitialData, models.length, samplers.length]);

    useEffect(() => {
        if (models.length === 0) return;
        if (!generation.selectedModel) {
            setGenerationState({ selectedModel: models[0].title });
        }
    }, [generation.selectedModel, models, setGenerationState]);

    useEffect(() => {
        if (!isActive) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
            if (ui.pageLocked) {
                e.preventDefault();
                return "";
            }
            return undefined;
        };

        if (ui.pageLocked) {
            window.addEventListener("beforeunload", handleBeforeUnload);
        }

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isActive, ui.pageLocked]);

    const fetchImageAsDataUrl = async (imageValue: string): Promise<string> => {
        const imageUrl = resolveImageSrc(imageValue, "full");
        if (!imageUrl) {
            throw new Error("Invalid image URL");
        }
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const getBase64Payload = async (imageValue: string | null): Promise<string | null> => {
        if (!imageValue) return null;
        if (typeof imageValue === "string" && imageValue.startsWith("data:")) {
            return imageValue;
        }
        return await fetchImageAsDataUrl(imageValue);
    };

    const handleModelChange = async (modelTitle: string): Promise<void> => {
        setGenerationState({ selectedModel: modelTitle });
        try {
            await api.setModel(modelTitle);
        } catch (error) {
            console.error("Error setting model:", error);
        }
    };

    const handleSkip = async (): Promise<void> => {
        try {
            await api.skip();
        } catch (error) {
            console.error("Error skipping generation:", error);
        }
    };

    const handleInterrupt = async (): Promise<void> => {
        try {
            await api.interrupt();
        } catch (error) {
            console.error("Error sending interrupt signal:", error);
        }
    };

    const handleRestart = (): void => {
        if (!generation.loading) return;
        setGenerationState({ pendingRestart: true });
        void handleInterrupt();
    };

    const handleEnd = (): void => {
        if (generation.pendingRestart) {
            setGenerationState({ pendingRestart: false });
        }
        void handleInterrupt();
    };

    const handleCanvasImageUpload = async (imageSrc: string): Promise<void> => {
        if (!workspaceId) return;
        try {
            const result = await api.importWorkspaceImage(workspaceId, imageSrc);
            const pathParts = result.image_path.split("/");
            const genid = pathParts.length >= 2 ? pathParts[1] : "unknown";

            const uploadedGeneration: Generation = {
                genid,
                status: "candidate",
                timestamp: Date.now(),
                source: "upload",
                workspace: workspaceId,
                prompt: "Uploaded image",
                negativePrompt: "",
                parameters: {},
            };

            await api.commitWorkspaceImage(workspaceId, `candidates/${genid}/full.webp`);
            const committedGeneration: Generation = { ...uploadedGeneration, status: "commit" };

            setGenerationState({ inputImage: getGenerationImageUrl(committedGeneration, "full") });

            setTimelineState((prev) => {
                const committedHistory = [committedGeneration, ...prev.committedHistory];
                return { ...prev, committedHistory };
            });

            setCanvasState({ currentImage: getGenerationImageUrl(committedGeneration, "full") });
        } catch (error) {
            console.error("Failed to import image to workspace:", error);
        }
    };

    const handlePreviewSelect = useCallback((generationItem: Generation | null): void => {
        console.log("handlePreviewSelect", generationItem);
        setTimelineState((prev) => ({
            ...prev,
            currentPreview: generationItem,
        }));

        if (!generationItem && mode.generationMode === "inpaint") {
            if (canvas.currentImage && !generation.inputImage) {
                setGenerationState({ inputImage: canvas.currentImage });
            }
            setModeState({ forceInpaintEditMode: true });
            setTimeout(() => setModeState({ forceInpaintEditMode: false }), 100);
        }
    }, [
        canvas.currentImage,
        generation.inputImage,
        mode.generationMode,
        setGenerationState,
        setModeState,
        setTimelineState,
    ]);

    const navigateCandidate = useCallback((direction: number) => {
        const queueLength = generationQueue.length;
        if (queueLength === 0) return;

        const currentIndex = generationQueue.findIndex((gen) => gen.genid === currentPreview?.genid);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (safeIndex + direction + queueLength) % queueLength;
        handlePreviewSelect(generationQueue[nextIndex]);
    }, [currentPreview, generationQueue, handlePreviewSelect]);

    const handleRejectPreview = async (): Promise<void> => {
        const preview = timeline.currentPreview;
        if (!preview) return;
        try {
            await api.rejectWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.webp`);
            await loadWorkspaceGenerations();
        } catch (error) {
            console.error("Failed to reject generation:", error);
        }
    };

    const handleCommitPreview = async (): Promise<void> => {
        const preview = timeline.currentPreview;
        if (!preview) return;
        const otherCandidates = timeline.generationQueue.filter((gen) => gen.genid !== preview.genid);
        const isPartial = Boolean(preview.partial_candidates_info?.length);

        if (isPartial) {
            setGenerationState({ composingPartial: true });
            setTimelineState((prev) => ({
                ...prev,
                generationQueue: [],
                currentPreview: preview,
            }));
        }

        try {
            for (const candidate of otherCandidates) {
                try {
                    await api.rejectWorkspaceImage(candidate.workspace, `candidates/${candidate.genid}/full.webp`);
                } catch (error) {
                    console.error(`Failed to reject candidate ${candidate.genid}:`, error);
                }
            }

            await api.commitWorkspaceImage(preview.workspace, `candidates/${preview.genid}/full.webp`);
            await loadWorkspaceGenerations();

            const committedImageUrl = getGenerationImageUrl({ ...preview, status: "commit" });
            setCanvasState({ currentImage: committedImageUrl });

            if (mode.generationMode !== "txt2img") {
                setGenerationState({ inputImage: committedImageUrl });
            }
        } catch (error) {
            console.error("Failed to commit generation:", error);
        } finally {
            if (isPartial) {
                setGenerationState({ composingPartial: false });
            }
        }
    };

    const handleDiscardGeneration = async (generationItem: Generation): Promise<void> => {
        try {
            const category = generationItem.status === "candidate"
                ? "candidates"
                : generationItem.status === "commit"
                    ? "commits"
                    : "rejects";
            await api.deleteWorkspaceImage(generationItem.workspace, `${category}/${generationItem.genid}/full.webp`);
            await loadWorkspaceGenerations();
        } catch (error) {
            console.error("Failed to delete generation:", error);
        }
    };

    const handleRestoreGeneration = async (generationItem: Generation): Promise<void> => {
        try {
            const category = generationItem.status === "reject" ? "rejects" : "commits";
            await api.restoreWorkspaceImage(generationItem.workspace, `${category}/${generationItem.genid}/full.webp`);
            await loadWorkspaceGenerations();
        } catch (error) {
            console.error("Failed to restore generation:", error);
        }
    };

    const handleUncommitGeneration = async (generationItem: Generation): Promise<void> => {
        try {
            await api.uncommitWorkspaceImage(generationItem.workspace, `commits/${generationItem.genid}/full.webp`);
            await loadWorkspaceGenerations();
        } catch (error) {
            console.error("Failed to uncommit generation:", error);
        }
    };

    const handleTimelapsePreview = useCallback((videoUrl: string) => {
        setTimelapseVideoUrl(videoUrl);
    }, []);

    const handleOpenUpscaleDialog = (sourceImage: { id: string; image: string; type: "timeline" | "canvas" }): void => {
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

    const handleCloseUpscaleDialog = (): void => {
        setUpscaleDialog((prev) => ({
            ...prev,
            isOpen: false,
            sourceImage: null,
            loading: false,
            error: null,
        }));
    };

    const getWorkspaceImagePath = (
        sourceImage: { id: string; image: string; type: "timeline" | "canvas" } | Generation | null
    ): string | null => {
        if (!sourceImage) return null;
        if ("genid" in sourceImage && "workspace" in sourceImage && "status" in sourceImage) {
            const category = sourceImage.status === "commit"
                ? "commits"
                : sourceImage.status === "reject"
                    ? "rejects"
                    : "candidates";
            return `${category}/${sourceImage.genid}/full.webp`;
        }
        if ("type" in sourceImage && sourceImage.type === "canvas") {
            if (canvas.currentImage) {
                const workspaceInfo = parseWorkspaceImage(canvas.currentImage);
                if (workspaceInfo) {
                    const pathParts = workspaceInfo.path.split("/");
                    if (pathParts.length >= 2 && ["candidates", "commits", "rejects"].includes(pathParts[0])) {
                        const category = pathParts[0];
                        const genid = pathParts[1];
                        return `${category}/${genid}/full.webp`;
                    }
                }
            }
            if (timeline.committedHistory.length > 0) {
                const latestCommit = timeline.committedHistory[0];
                return `commits/${latestCommit.genid}/full.webp`;
            }
        }
        return null;
    };

    const handleUpscale = async (upscaler: string, scaleFactor: number): Promise<void> => {
        if (!upscaleDialog.sourceImage) return;
        setUpscaleDialog((prev) => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            if (!workspaceId) {
                throw new Error("Workspace not initialized");
            }

            const workspaceImagePath = getWorkspaceImagePath(upscaleDialog.sourceImage);
            const params: ExtrasSingleImageParams = {
                upscaler_1: upscaler,
                upscaling_resize: scaleFactor,
                resize_mode: 0,
                show_extras_results: true,
                workspace_name: workspaceId,
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
                setTimelineState((prev) => ({
                    ...prev,
                    generationQueue: [result.generation!, ...prev.generationQueue],
                    currentPreview: result.generation!,
                }));
            }

            handleCloseUpscaleDialog();
        } catch (error) {
            console.error("Upscale failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Upscale failed. Please try again.";
            setUpscaleDialog((prev) => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
        }
    };


    useKeyboardShortcuts({
        "g": () => {
            if (generation.loading) {
                void handleInterrupt();
            } else if (composerPrompt.trim()) {
                void generateImage();
            }
        },
        "s": () => {
            void handleSkip();
        },
        "h": () => {
            void handleRestart();
        },
        "`": () => setCanvasState({ footerCollapsed: !canvas.footerCollapsed }),
        "alt+`": () => handlePromptModeChange(ui.promptMode === "simple" ? "composer" : "simple"),
        "alt+t": () => handleGenerationModeChange("txt2img"),
        "alt+i": () => handleGenerationModeChange("img2img"),
        "alt+n": () => handleGenerationModeChange("inpaint"),
        "ctrl+b": () => setUiState({ sidebarCollapsed: !ui.sidebarCollapsed }),
        "arrowleft": () => navigateCandidate(-1),
        "arrowright": () => navigateCandidate(1),
        "backspace": () => {
            void handleRejectPreview();
        },
        "enter": () => {
            void handleCommitPreview();
        },
    }, isActive && !generation.composingPartial);

    const canvasControls = {
        loading: generation.loading,
        progress,
        onGenerate: generateImage,
        canGenerate: !!composerPrompt.trim(),
        onSkip: handleSkip,
        onRestart: handleRestart,
        onInterrupt: handleEnd,
        pendingRestart: generation.pendingRestart,
        steps: generation.steps,
        setSteps: (value: number) => setGenerationState({ steps: value }),
        count: generation.count,
        setCount: (value: number) => setGenerationState({ count: value }),
        width: generation.width,
        setWidth: (value: number) => setGenerationState({ width: value }),
        height: generation.height,
        setHeight: (value: number) => setGenerationState({ height: value }),
        inputImage: generation.inputImage,
        pageLocked: ui.pageLocked,
        onToggleLock: () => setUiState({ pageLocked: !ui.pageLocked }),
        isComposingPartial: generation.composingPartial,
        models,
        selectedModel: generation.selectedModel,
        onModelChange: handleModelChange,
        samplers,
        selectedSampler: generation.selectedSampler,
        setSelectedSampler: (value: string) => setGenerationState({ selectedSampler: value }),
        cfgScale: generation.cfgScale,
        setCfgScale: (value: number) => setGenerationState({ cfgScale: value }),
        // Timeline-related props for GenerationsNavigator
        generationQueue: timeline.generationQueue,
        currentPreview: timeline.currentPreview,
        latestCommit: timeline.committedHistory[0] ?? null,
        onPreviewSelect: handlePreviewSelect,
        onCommit: handleCommitPreview,
        onReject: handleRejectPreview,
    };

    return (
        <div className={`flex-1 flex overflow-hidden ${isActive ? "" : "hidden"}`}>
            <Sidebar
                collapsed={ui.sidebarCollapsed}
                onToggle={() => setUiState({ sidebarCollapsed: !ui.sidebarCollapsed })}
                timeline={timeline}
                currentImage={canvas.currentImage}
                onPreviewSelect={handlePreviewSelect}
                onCommitPreview={handleCommitPreview}
                onRejectPreview={handleRejectPreview}
                onDiscardGeneration={handleDiscardGeneration}
                onRestoreGeneration={handleRestoreGeneration}
                onUncommitGeneration={handleUncommitGeneration}
                onGenerationModeChange={handleGenerationModeChange}
                generationMode={mode.generationMode}
                onUpscale={handleOpenUpscaleDialog}
                getGenerationImageUrl={getGenerationImageUrl}
                onRefreshTimeline={loadWorkspaceGenerations}
                onRefreshCanvas={handleRefreshCanvas}
                onEditCanvas={handleEditCanvas}
                canvasRefreshKey={canvas.canvasRefreshKey}
                isComposingPartial={generation.composingPartial}
                workspaceId={workspaceId}
                onTimelapsePreview={handleTimelapsePreview}
            />

            {mode.generationMode === "inpaint" ? (
                <InpaintCanvas
                    currentGeneration={timeline.currentPreview}
                    currentImage={canvas.currentImage}
                    previewImage={getGenerationImageUrl(timeline.currentPreview)}
                    onClearPreview={() => handlePreviewSelect(null)}
                    onRegisterMaskSnapshotProvider={handleRegisterMaskSnapshotProvider}
                    previewMaskSnapshot={mode.inpaintMaskSnapshot}
                    inputImage={generation.inputImage}
                    workspaceId={workspaceId}
                    livePreview={livePreview}
                    loading={generation.loading}
                    progress={progress}
                    generationWidth={generation.width}
                    generationHeight={generation.height}
                    composerNodes={composerNodes}
                    onComposerNodesChange={handleComposerNodesChange}
                    promptMode={ui.promptMode}
                    onPromptModeChange={handlePromptModeChange}
                    setInpaintMask={handleInpaintMaskChange}
                    onImageUpload={handleCanvasImageUpload}
                    inpaintFullRes={mode.inpaintFullRes}
                    inpaintFullResPadding={mode.inpaintFullResPadding}
                    setInpaintFullResPadding={(value) => setModeState({ inpaintFullResPadding: value })}
                    setInpaintFullRes={(value) => setModeState({ inpaintFullRes: value })}
                    forceEditMode={mode.forceInpaintEditMode}
                    maskBlur={mode.maskBlur}
                    setMaskBlur={(value) => setModeState({ maskBlur: value })}
                    inpaintingFill={mode.inpaintingFill}
                    setInpaintingFill={(value) => setModeState({ inpaintingFill: value })}
                    denoisingStrength={generation.denoisingStrength}
                    setDenoisingStrength={(value) => setGenerationState({ denoisingStrength: value })}
                    inpaintingMaskInvert={mode.inpaintingMaskInvert}
                    setInpaintingMaskInvert={(value) => setModeState({ inpaintingMaskInvert: value })}
                    generationMode={mode.generationMode}
                    canvasRefreshKey={canvas.canvasRefreshKey}
                    canvasControls={canvasControls}
                    footerCollapsed={canvas.footerCollapsed}
                    onToggleFooter={() => setCanvasState({ footerCollapsed: !canvas.footerCollapsed })}
                    timelapseVideoUrl={timelapseVideoUrl}
                    onCloseTimelapse={() => setTimelapseVideoUrl(null)}
                />
            ) : (
                <InpaintCanvas
                    currentGeneration={timeline.currentPreview}
                    currentImage={canvas.currentImage}
                    previewImage={getGenerationImageUrl(timeline.currentPreview)}
                    onClearPreview={() => handlePreviewSelect(null)}
                    onRegisterMaskSnapshotProvider={handleRegisterMaskSnapshotProvider}
                    previewMaskSnapshot={mode.inpaintMaskSnapshot}
                    workspaceId={workspaceId}
                    livePreview={livePreview}
                    loading={generation.loading}
                    progress={progress}
                    generationWidth={generation.width}
                    generationHeight={generation.height}
                    composerNodes={composerNodes}
                    onComposerNodesChange={handleComposerNodesChange}
                    promptMode={ui.promptMode}
                    onPromptModeChange={handlePromptModeChange}
                    setInpaintMask={noopSetInpaintMask}
                    forceEditMode={false}
                    maskBlur={mode.maskBlur}
                    setMaskBlur={(value) => setModeState({ maskBlur: value })}
                    inpaintingFill={mode.inpaintingFill}
                    setInpaintingFill={(value) => setModeState({ inpaintingFill: value })}
                    denoisingStrength={generation.denoisingStrength}
                    setDenoisingStrength={(value) => setGenerationState({ denoisingStrength: value })}
                    setInpaintFullRes={() => { }}
                    inpaintingMaskInvert={mode.inpaintingMaskInvert}
                    setInpaintingMaskInvert={(value) => setModeState({ inpaintingMaskInvert: value })}
                    inputImage={mode.generationMode === "img2img" ? generation.inputImage : null}
                    onImageUpload={mode.generationMode === "img2img" ? handleCanvasImageUpload : undefined}
                    inpaintFullRes={false}
                    inpaintFullResPadding={0}
                    setInpaintFullResPadding={() => { }}
                    generationMode={mode.generationMode}
                    canvasRefreshKey={canvas.canvasRefreshKey}
                    canvasControls={canvasControls}
                    footerCollapsed={canvas.footerCollapsed}
                    onToggleFooter={() => setCanvasState({ footerCollapsed: !canvas.footerCollapsed })}
                    timelapseVideoUrl={timelapseVideoUrl}
                    onCloseTimelapse={() => setTimelapseVideoUrl(null)}
                />
            )}

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
        </div>
    );
};

export default memo(Workspace);
