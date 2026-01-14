# Stable Diffusion API Client

A simple React-based client for the Stable Diffusion Forge API.

## Features

- Text-to-Image generation
- Model selection
- Sampler selection
- Configurable generation parameters
- Image gallery display

## Getting Started

1. Make sure the Stable Diffusion API server is running on port 7861
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`

## API Requirements

This client expects the Stable Diffusion API to be running on `http://localhost:7861`. The Vite dev server is configured to proxy API requests to this endpoint.

## Available Endpoints Used

- `POST /sdapi/v1/txt2img` - Generate images from text
- `GET /sdapi/v1/sd-models` - Get available models
- `GET /sdapi/v1/samplers` - Get available samplers
- `POST /sdapi/v1/options` - Set model options