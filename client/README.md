# Stable Diffusion API Client

A simple React-based client for the Stable Diffusion Forge API.

## Features

- Text-to-Image generation
- Model selection
- Sampler selection
- Configurable generation parameters
- Image gallery display
- **Real-time progress updates** via WebSocket
- Live preview images during generation
- Progress bars and ETA display

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

## WebSocket Progress Updates

The client uses WebSocket connections for real-time progress updates during image generation:

- **WebSocket Endpoint**: `ws://localhost:7861/internal/progress-ws`
- **Features**:
  - Live progress percentage
  - Real-time preview images
  - ETA calculations
  - Status messages
  - Step-by-step progress

### Current Status

**WebSocket progress tracking is temporarily disabled** due to compatibility issues with extension scripts. Basic image generation works without WebSocket progress updates.

### To Re-enable WebSocket Progress:

1. In `client/src/App.jsx`, change:
   ```javascript
   const data = await api.txt2imgSimple(params)
   ```
   to:
   ```javascript
   const data = await api.txt2img(params)
   ```

2. Uncomment the WebSocket progress hook:
   ```javascript
   const { progress, isConnected, livePreview } = useWebSocketProgress(currentTaskId)
   ```

### Testing WebSocket Functionality

A test page is available to verify WebSocket connectivity when re-enabled:

1. Start the API server with WebSocket support
2. Open `websocket_test.html` in your browser
3. Click "Connect WebSocket" to establish connection
4. Click "Test Generate" to see real-time progress updates

The test page demonstrates:
- WebSocket connection management
- Progress bar updates
- Live preview display
- Real-time status messages