const API_BASE_URL = '/api';

class StableDiffusionAPI {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
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

  // Text to Image
  async txt2img(params) {
    return this.request('/sdapi/v1/txt2img', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Image to Image
  async img2img(params) {
    return this.request('/sdapi/v1/img2img', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Get available models
  async getModels() {
    return this.request('/sdapi/v1/sd-models');
  }

  // Set current model
  async setModel(modelTitle) {
    return this.request('/sdapi/v1/options', {
      method: 'POST',
      body: JSON.stringify({
        sd_model_checkpoint: modelTitle,
      }),
    });
  }

  // Get current options
  async getOptions() {
    return this.request('/sdapi/v1/options');
  }

  // Set options
  async setOptions(options) {
    return this.request('/sdapi/v1/options', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Get samplers
  async getSamplers() {
    return this.request('/sdapi/v1/samplers');
  }

  // Get upscalers
  async getUpscalers() {
    return this.request('/sdapi/v1/upscalers');
  }

  // Interrogate (analyze image)
  async interrogate(image, model = 'clip') {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('model', model);

    return this.request('/sdapi/v1/interrogate', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }

  // PNG Info (get metadata from image)
  async getPngInfo(imageBase64) {
    return this.request('/sdapi/v1/png-info', {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
      }),
    });
  }

  // Progress
  async getProgress() {
    return this.request('/sdapi/v1/progress');
  }
}

// Create singleton instance
const api = new StableDiffusionAPI();

export default api;