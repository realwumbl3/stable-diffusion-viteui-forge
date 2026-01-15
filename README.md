# 🚀 Stable Diffusion WebUI Forge



> **Full-Stack Stable Diffusion Studio** - A complete stable diffusion platform featuring both a powerful RESTful API server and a modern React/Vite frontend studio for intuitive image generation and creative workflows.

[![See webui forge readme](https://img.shields.io/badge/See%20webui%20forge%20readme-blue)](https://github.com/lllyasviel/stable-diffusion-webui-forge/blob/main/README.md)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://www.python.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF)](https://vitejs.dev/)

## ✨ What is This?

**Stable Diffusion WebUI Forge** is a comprehensive stable diffusion platform that provides both:

- **🎨 Full Studio Interface**: A modern React/Vite web application with intuitive tools for prompt composition, canvas editing, and creative workflows
- **🔌 Powerful API Server**: FastAPI-based RESTful and WebSocket endpoints for programmatic access and third-party integrations

Built on the foundation of [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge), this platform offers the best of both worlds - a user-friendly creative studio and a robust API for developers.

### 🚀 Key Features

#### 🎨 Studio Interface
- **🖌️ Visual Prompt Composer**: Drag-and-drop interface for building complex prompts with tags, weights, and modifiers
- **🎯 Canvas Editor**: Interactive canvas for image-to-image workflows and region-based prompting
- **⚡ Real-time Preview**: Live progress updates and generation previews
- **🎛️ Advanced Controls**: Fine-tuned parameter controls for professional results
- **📱 Responsive Design**: Modern, mobile-friendly interface built with React and Vite

#### 🔌 API Server
- **🎯 RESTful Endpoints**: Clean FastAPI endpoints with OpenAPI documentation
- **⚡ High Performance**: Optimized for both local and server deployment
- **🔌 WebSocket Support**: Real-time progress updates and notifications
- **📚 Full Documentation**: Interactive API docs at `/docs`
- **🛠️ Developer Friendly**: Well-structured endpoints for easy integration
- **🔧 Extensible**: Full extension support maintained

## 📋 Prerequisites

#### For Full Studio (Frontend + Backend)
- **Node.js 18+** and **npm** or **yarn** (for the React/Vite frontend)
- **Python 3.10+** for the backend API server
- **CUDA-compatible GPU** (recommended for generation)
- **Git** for cloning repositories

#### For API Server Only
- **Python 3.10+** for the backend
- **CUDA-compatible GPU** (recommended for generation)

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/realwumbl3/stable-diffusion-api-server.git
cd stable-diffusion-api-server
```

### 2. Install Dependencies

```bash
# Install Python dependencies (backend)
pip install -r requirements_versions.txt

# Install Node.js dependencies (frontend)
cd client
npm install
cd ..
```

### 3. Start the Full Studio

```bash
# On Windows - starts both backend API and frontend dev server
webui.bat

# On Linux/Mac - starts both backend API and frontend
python launch.py
```

The full studio will be available at:
- **🎨 Studio Interface**: `http://localhost:5173`
- **🔌 API Server**: `http://localhost:7861`
- **📚 API Documentation**: `http://localhost:7861/docs`
- **🔌 WebSocket Progress**: `ws://localhost:7861/ws`

### Alternative: API Server Only

For API-only usage, start just the backend:

```bash
# On Windows
nowebui.bat

# On Linux/Mac
python launch.py --nowebui
```

API endpoints available at `http://localhost:7861`.

## 🎯 Features

### 🎨 Studio Interface
- **🖌️ Visual Prompt Composer**: Drag-and-drop interface for building complex prompts
- **🏷️ Tag-Based Prompting**: Organized tag system with weights and modifiers
- **🎯 Interactive Canvas**: Region-based prompting and image editing
- **⚡ Live Progress**: Real-time generation updates and previews
- **🎛️ Advanced Parameters**: Fine control over generation settings
- **📱 Mobile Responsive**: Works seamlessly on desktop and mobile devices

### 🔌 RESTful API Endpoints
- **Image Generation**: Text-to-image with advanced parameters
- **Image-to-Image**: Transform existing images with prompts
- **Model Management**: Load, switch, and manage models
- **Progress Tracking**: Real-time generation progress via WebSocket
- **Extension Support**: Full compatibility with Forge extensions

### 📚 API Documentation
- **OpenAPI/Swagger**: Interactive API documentation at `/docs`
- **Request/Response Examples**: Complete with sample payloads
- **Authentication Support**: API key and token-based auth
- **Rate Limiting**: Configurable request limits

### 🏭 Production Ready
- **High Performance**: Optimized for both local and server deployment
- **Concurrent Requests**: Queue-based processing system
- **Health Monitoring**: Built-in health checks and metrics
- **Docker Support**: Container-ready deployment
- **Logging**: Comprehensive request and error logging

## 📁 Project Structure

```
stable-diffusion-webui-forge/
├── client/               # React/Vite frontend studio
│   ├── src/
│   │   ├── components/   # React components (PromptComposer, Canvas, etc.)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # State management
│   │   └── api.js        # API client utilities
│   ├── package.json
│   └── vite.config.js
├── backend/              # Python backend (Forge)
├── modules/              # Core modules
├── modules_forge/        # Forge-specific modules
├── extensions-builtin/   # Built-in extensions
├── models/               # Model storage directory
├── requirements_versions.txt
├── webui.py             # Main API entry point
├── launch.py            # Launch script
├── webui.bat            # Windows launcher (full studio)
└── nowebui.bat          # Windows launcher (API only)
```

## 🔧 Development

### Full Stack Development (Frontend + Backend)

```bash
# Install Python dependencies (backend)
pip install -r requirements_versions.txt

# Install Node.js dependencies (frontend)
cd client && npm install && cd ..

# Start the full development environment
python launch.py  # This starts both backend and frontend dev server
```

Access points:
- **Studio Interface**: `http://localhost:5173`
- **API Server**: `http://localhost:7861`
- **API Docs**: `http://localhost:7861/docs`

### Frontend Development Only

```bash
cd client

# Install dependencies
npm install

# Start development server (Vite with hot reload)
npm run dev

# Build for production
npm run build
```

### Backend API Development Only

```bash
# Install dependencies
pip install -r requirements_versions.txt

# Run API server only
python launch.py --nowebui

# Access API documentation
curl http://localhost:7861/docs
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:7861/health

# List available models
curl http://localhost:7861/sdapi/v1/sd-models

# Generate an image (example)
curl -X POST http://localhost:7861/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful landscape", "steps": 20}'
```

### Environment Configuration

Create a `.env` file in the `client` directory for frontend configuration:

```env
VITE_API_BASE_URL=http://localhost:7861
VITE_API_DOCS_URL=http://localhost:7861/docs
VITE_WS_URL=ws://localhost:7861/ws
```

## 🚀 Deployment

### Full Stack Production Deployment

```bash
# Install Python dependencies
pip install -r requirements_versions.txt

# Build frontend for production
cd client && npm install && npm run build && cd ..

# Start production server (serves both API and built frontend)
python launch.py --port 7861 --listen
```

The production build serves:
- **Frontend**: `http://your-domain.com`
- **API**: `http://your-domain.com/api/*`
- **API Docs**: `http://your-domain.com/docs`

### API Server Only Deployment

```bash
# Install dependencies
pip install -r requirements_versions.txt

# Start production API server
python launch.py --port 7861 --listen --nowebui
```

### Separate Frontend Deployment

For deploying frontend and backend separately:

```bash
# Backend deployment
pip install -r requirements_versions.txt
python launch.py --port 7861 --listen --nowebui

# Frontend deployment (after building)
cd client
npm install
npm run build
# Serve the dist/ folder with any static server
```

### Docker Deployment

```dockerfile
# Multi-stage build for full stack
FROM node:18 AS frontend-build
WORKDIR /frontend
COPY client/ .
RUN npm install && npm run build

FROM python:3.10-slim
WORKDIR /app

# Copy backend
COPY requirements_versions.txt .
RUN pip install -r requirements_versions.txt
COPY . .

# Copy built frontend
COPY --from=frontend-build /frontend/dist ./client/dist

EXPOSE 7861
CMD ["python", "launch.py", "--port", "7861", "--listen"]
```

### Reverse Proxy Configuration

For production deployments with separate frontend/backend:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (served by separate server or CDN)
    location / {
        proxy_pass http://frontend-server:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:7861;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API docs
    location /docs/ {
        proxy_pass http://localhost:7861/docs;
    }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 Documentation

- **Backend API**: See [original Forge docs](https://github.com/lllyasviel/stable-diffusion-webui-forge)
- **Frontend Development**: Check the `client/README.md`
- **UI Components**: Component documentation in `client/src/components/`

## 🔗 Related Projects

- [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) - Original backend
- [Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) - Base WebUI
- [Automatic1111 API](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API) - API reference

## 📝 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE.txt) file for details.

## ⚠️ Disclaimer

This project is based on [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) and extends it with a modern React/Vite frontend studio interface. The backend maintains full compatibility with the original Forge ecosystem.

## 🙏 Acknowledgments

- **lllyasviel** for the amazing Stable Diffusion WebUI Forge backend
- **AUTOMATIC1111** for the original Stable Diffusion WebUI and API design
- **FastAPI** community for the excellent web framework

---

**Ready to create amazing AI art?** Choose your path - use the full studio interface or integrate the powerful API into your applications! 🎨🚀✨