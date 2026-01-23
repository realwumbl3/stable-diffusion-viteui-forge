import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

export interface Generation {
  genid: string;
  status: 'candidate' | 'commit' | 'reject';
  timestamp: number;
  source: 'txt2img' | 'img2img' | 'inpaint' | 'upscale';
  prompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, any>;
  workspace: string;
}

export interface WorkspaceState {
  // Generation parameters
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  batchSize: number;
  count: number;
  denoisingStrength: number;

  // Model and sampler
  selectedModel: string;
  selectedSampler: string;
  clipSkip: number;

  // Canvas data
  currentImage: string | null;
  inpaintMask: string | null;
  maskBlur: number;
  inpaintingFill: number;
  inpaintFullRes: boolean;
  inpaintFullResPadding: number;
  inpaintingMaskInvert: boolean;
  canvasPadding: number;

  // Timeline
  timeline: {
    generationQueue: Generation[];
    currentPreview: Generation | null;
    committedHistory: Generation[];
    discarded: Generation[];
  };

  // Prompt nodes
  composerNodes: any[];

  // Generation mode
  generationMode: 'txt2img' | 'img2img' | 'inpaint';
}

// Default state for new workspaces
const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  // Generation parameters
  steps: 20,
  cfgScale: 7,
  width: 512,
  height: 512,
  batchSize: 1,
  count: 1,
  denoisingStrength: 0.75,

  // Model and sampler (will be set from global state)
  selectedModel: '',
  selectedSampler: 'Euler a',
  clipSkip: 1,

  // Canvas data
  currentImage: null,
  inpaintMask: null,
  maskBlur: 4,
  inpaintingFill: 0,
  inpaintFullRes: true,
  inpaintFullResPadding: 64,
  inpaintingMaskInvert: false,
  canvasPadding: 64,

  // Timeline
  timeline: {
    generationQueue: [],
    currentPreview: null,
    committedHistory: [],
    discarded: [],
  },

  // Prompt nodes
  composerNodes: [],

  // Generation mode
  generationMode: 'txt2img',
};

export const useWorkspaceState = () => {
  const [workspaceStates, setWorkspaceStates] = useState<Map<string, WorkspaceState>>(() => new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(() => new Map());
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load workspace state from backend
  const loadWorkspaceState = useCallback(async (workspaceName: string) => {
    if (!workspaceName) return;

    setLoadingStates(prev => new Map(prev.set(workspaceName, true)));

    try {
      const data = await api.getWorkspaceState(workspaceName);
      const state = { ...DEFAULT_WORKSPACE_STATE, ...data };

      setWorkspaceStates(prev => new Map(prev.set(workspaceName, state)));
    } catch (error) {
      console.error(`Failed to load workspace state for ${workspaceName}:`, error);
      // Initialize with default state
      setWorkspaceStates(prev => new Map(prev.set(workspaceName, { ...DEFAULT_WORKSPACE_STATE })));
    } finally {
      setLoadingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(workspaceName);
        return newMap;
      });
    }
  }, []);

  // Save workspace state to backend with debouncing
  const saveWorkspaceState = useCallback((workspaceName: string, state: WorkspaceState) => {
    if (!workspaceName) return;

    // Clear existing timeout
    const existingTimeout = saveTimeoutsRef.current.get(workspaceName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for debounced save
    const timeout = setTimeout(async () => {
      try {
        await api.saveWorkspaceState(workspaceName, state);
      } catch (error) {
        console.error(`Failed to save workspace state for ${workspaceName}:`, error);
      }
    }, 500); // 500ms debounce

    saveTimeoutsRef.current.set(workspaceName, timeout);
  }, []);

  // Get workspace state
  const getWorkspaceState = useCallback((workspaceName: string): WorkspaceState | null => {
    return workspaceStates.get(workspaceName) || null;
  }, [workspaceStates]);

  // Update workspace state
  const updateWorkspaceState = useCallback((workspaceName: string, updates: Partial<WorkspaceState>) => {
    setWorkspaceStates(prev => {
      const currentState = prev.get(workspaceName);
      if (!currentState) return prev;

      const newState = { ...currentState, ...updates };
      const newMap = new Map(prev.set(workspaceName, newState));

      // Trigger save to backend
      saveWorkspaceState(workspaceName, newState);

      return newMap;
    });
  }, [saveWorkspaceState]);

  // Initialize workspace state (load from backend or create default)
  const initializeWorkspaceState = useCallback((workspaceName: string) => {
    if (!workspaceStates.has(workspaceName)) {
      // Set default state immediately so UI can render
      setWorkspaceStates(prev => new Map(prev.set(workspaceName, { ...DEFAULT_WORKSPACE_STATE })));
      // Then load persisted state from backend
      loadWorkspaceState(workspaceName);
    }
  }, [workspaceStates, loadWorkspaceState]);

  // Remove workspace state (when workspace is closed)
  const removeWorkspaceState = useCallback((workspaceName: string) => {
    setWorkspaceStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(workspaceName);
      return newMap;
    });

    // Clear any pending saves
    const timeout = saveTimeoutsRef.current.get(workspaceName);
    if (timeout) {
      clearTimeout(timeout);
      saveTimeoutsRef.current.delete(workspaceName);
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      saveTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      saveTimeoutsRef.current.clear();
    };
  }, []);

  return {
    getWorkspaceState,
    updateWorkspaceState,
    initializeWorkspaceState,
    removeWorkspaceState,
    isWorkspaceLoading: (workspaceName: string) => loadingStates.has(workspaceName),
  };
};