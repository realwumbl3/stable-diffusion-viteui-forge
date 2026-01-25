// VITE UI
// API Types
import type { WorkspaceStructureNode } from './types/components';
import type { PromptNode } from './components/PromptComposer/types';

export interface Txt2ImgParams {
  prompt: string;
  negative_prompt?: string;
  steps: number;
  width: number;
  height: number;
  cfg_scale: number;
  sampler_name: string;
  batch_size: number;
  n_iter: number;
  clip_skip?: number;
  save_images?: boolean;
  save_grids?: boolean;
  force_task_id?: string;
  workspace_name: string;
}

export interface Img2ImgParams extends Txt2ImgParams {
  genid: string;
  mask?: string;
  mask_blur?: number;
  inpainting_fill?: number;
  inpaint_full_res?: boolean;
  inpaint_full_res_padding?: number;
  inpainting_mask_invert?: number;
  denoising_strength: number;
}

export interface ModelInfo {
  title: string;
  model_name: string;
  hash: string;
  sha256: string;
  filename: string;
  config: string | null;
}

export interface SamplerInfo {
  name: string;
  aliases: string[];
  options: Record<string, unknown>;
}

export interface UpscalerInfo {
  name: string;
  model_name?: string;
  model_path?: string;
  model_url?: string;
  scale: number;
}

export interface ExtrasSingleImageParams {
  image?: string; // Base64 image (fallback if workspace_image_path not provided)
  workspace_image_path?: string; // Workspace-relative path (e.g., "commits/genid/full.png")
  upscaler_1: string;
  upscaling_resize: number;
  resize_mode: number;
  show_extras_results?: boolean;
  gfpgan_visibility?: number;
  codeformer_visibility?: number;
  codeformer_weight?: number;
  upscaling_resize_w?: number;
  upscaling_resize_h?: number;
  upscaling_crop?: boolean;
  upscaler_2?: string;
  extras_upscaler_2_visibility?: number;
  upscale_first?: boolean;
  workspace_name?: string;
}

export interface ProgressInfo {
  progress: number;
  eta_relative: number;
  state: {
    skipped: boolean;
    interrupted: boolean;
    job: string;
    job_count: number;
    job_timestamp: string;
    job_no: number;
    sampling_step: number;
    sampling_steps: number;
  };
  current_image?: string;
  textinfo?: string;
}

export interface WorkspaceInfo {
  name: string;
  created?: string | null;
  folders?: string[];
}

export interface WorkspacePrompt {
  nodes: PromptNode[];
}

export interface GenerationResponse {
  images: string[];
  filesystem_paths?: string[];
  workspace_info?: Record<string, unknown>;
  parameters: Record<string, unknown>;
  info: string;
  taskId?: string;
}

export interface ExtrasResponse {
  image: string;
  html_info: string;
  generation?: Generation;
  taskId?: string;
}

export interface Generation {
  genid: string;
  status: 'candidate' | 'commit' | 'reject';
  timestamp: number;
  source: 'txt2img' | 'img2img' | 'inpaint' | 'upscale' | 'upload';
  prompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
  workspace: string;
  image?: string;
}

import { API_BASE_URL as BASE_URL } from './lib/utils';

class StableDiffusionAPI {
  constructor(private baseUrl: string = `${BASE_URL}/api`) {}

  async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Text to Image (legacy - generates its own task ID)
  async txt2img(params: Txt2ImgParams): Promise<GenerationResponse> {
    // Respect provided task ID when available (e.g. generated inside App)
    const taskId = params.force_task_id ?? `task(txt2img-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    const result = await this.request<GenerationResponse>('/viteapi/txt2img', {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    });

    // Add task ID to result for progress tracking
    result.taskId = taskId
    return result
  }


  // Image to Image
  async img2img(params: Img2ImgParams): Promise<GenerationResponse> {
    // Respect provided task ID when available (e.g. generated inside App)
    const taskId = params.force_task_id ?? `task(img2img-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    const result = await this.request<GenerationResponse>('/viteapi/img2img', {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    });

    // Add task ID to result for progress tracking
    result.taskId = taskId
    return result
  }

  // Get available models
  async getModels(): Promise<ModelInfo[]> {
    return this.request<ModelInfo[]>('/sdapi/v1/sd-models');
  }

  // Get current options
  async getOptions(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/sdapi/v1/options');
  }

  // Set current model
  async setModel(modelTitle: string): Promise<void> {
    return this.request<void>('/sdapi/v1/options', {
      method: 'POST',
      body: JSON.stringify({
        sd_model_checkpoint: modelTitle,
      }),
    });
  }

  // Set options
  async setOptions(options: Record<string, unknown>): Promise<void> {
    return this.request<void>('/sdapi/v1/options', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Get samplers
  async getSamplers(): Promise<SamplerInfo[]> {
    return this.request<SamplerInfo[]>('/sdapi/v1/samplers');
  }

  // Get upscalers
  async getUpscalers(): Promise<UpscalerInfo[]> {
    return this.request<UpscalerInfo[]>('/sdapi/v1/upscalers');
  }

  // Extra single image (upscaling, face restoration, etc.)
  async extraSingleImage(params: ExtrasSingleImageParams): Promise<ExtrasResponse> {
    // Add a task ID to track progress
    const taskId = `task(extra-single-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    // Use viteapi endpoint if workspace_image_path is provided, otherwise use standard endpoint
    const endpoint = params.workspace_image_path && params.workspace_name 
      ? '/viteapi/extras' 
      : '/sdapi/v1/extra-single-image'

    const result = await this.request<ExtrasResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    });

    // Add task ID to result for progress tracking
    result.taskId = taskId
    return result
  }

  // Interrogate (analyze image)
  async interrogate(image: File | Blob, model: string = 'clip'): Promise<{ caption: string }> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('model', model);

    return this.request<{ caption: string }>('/sdapi/v1/interrogate', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }

  // PNG Info (get metadata from image)
  async getPngInfo(imageBase64: string): Promise<{ info: string; items: Record<string, unknown> }> {
    return this.request<{ info: string; items: Record<string, unknown> }>('/sdapi/v1/png-info', {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
      }),
    });
  }

  // Progress
  async getProgress(): Promise<ProgressInfo> {
    return this.request<ProgressInfo>('/sdapi/v1/progress');
  }

  // Skip current generation
  async skip(): Promise<void> {
    return this.request<void>('/sdapi/v1/skip', {
      method: 'POST',
    });
  }

  // Interrupt/stop all generations
  async interrupt(): Promise<void> {
    return this.request<void>('/sdapi/v1/interrupt', {
      method: 'POST',
    });
  }

  // Workspace APIs
  async listWorkspaces(): Promise<{ workspaces: WorkspaceInfo[] }> {
    return this.request<{ workspaces: WorkspaceInfo[] }>('/workspaces');
  }

  async createWorkspace(name: string): Promise<{ success: boolean; name: string; message?: string }> {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getWorkspaceStructure(): Promise<{ structure: WorkspaceStructureNode }> {
    return this.request<{ structure: WorkspaceStructureNode }>('/workspaces/structure');
  }

  async createWorkspaceFolder(path: string): Promise<{ success: boolean; path: string; message?: string }> {
    return this.request('/workspaces/folders', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async getWorkspacePrompt(workspaceName: string): Promise<WorkspacePrompt> {
    return this.request<WorkspacePrompt>(`/workspaces/${encodeURIComponent(workspaceName)}/prompt`);
  }

  async saveWorkspacePrompt(workspaceName: string, promptData: WorkspacePrompt): Promise<WorkspacePrompt> {
    return this.request<WorkspacePrompt>(`/workspaces/${encodeURIComponent(workspaceName)}/prompt`, {
      method: 'POST',
      body: JSON.stringify(promptData),
    });
  }

  async importWorkspaceImage(workspaceName: string, imageBase64: string): Promise<{ success: boolean; image_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/import`, {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
  }

  async commitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; commit_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/commit`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async rejectWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; reject_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async restoreWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; restore_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async uncommitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; uncommit_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/uncommit`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async deleteWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; delete_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/delete`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async openWorkspaceImageInMspaint(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/open-mspaint`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async revealWorkspacePath(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/reveal`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  // Get generation asset (meta.json, full.png, 512.png)
  async getGenerationAsset(workspaceName: string, category: string, genid: string, asset: string): Promise<unknown> {
    const url = `/workspaces/${encodeURIComponent(workspaceName)}/${category}/${genid}/${asset}`;
    if (asset.endsWith('.json')) {
      return this.request(url);
    } else {
      // For binary assets like images, return the raw response
      const response = await fetch(`${this.baseUrl}${url}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
      }
      return response;
    }
  }

  // Get generations for a workspace
  async getGenerations(workspaceName: string): Promise<Generation[]> {
    return this.request<Generation[]>(`/workspaces/${encodeURIComponent(workspaceName)}/generations`);
  }

  // Move workspace or folder
  async moveWorkspaceItem(sourcePath: string, destinationPath: string): Promise<{ success: boolean; source_path: string; destination_path: string }> {
    return this.request(`/workspaces/move`, {
      method: 'POST',
      body: JSON.stringify({ source_path: sourcePath, destination_path: destinationPath }),
    });
  }

  // Rename workspace or folder
  async renameWorkspaceItem(itemPath: string, newName: string): Promise<{ success: boolean; old_path: string; new_path: string }> {
    return this.request(`/workspaces/rename`, {
      method: 'POST',
      body: JSON.stringify({ item_path: itemPath, new_name: newName }),
    });
  }

}

// Create singleton instance
const api = new StableDiffusionAPI();

export default api;