# 🚀 ViteUI - Modern Stable Diffusion Interface

> **Next-Generation Stable Diffusion UI** - A modern React/Vite frontend that wraps the Stable Diffusion WebUI Forge API, providing an intuitive and powerful interface for creative AI image generation.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6)](https://www.typescriptlang.org/)

## ✨ What is ViteUI?

**ViteUI** is a modern, client-focused Stable Diffusion interface that:

- **🎨 Modern UI**: Built entirely with React/Vite, providing a clean and responsive interface
- **🔌 API Wrapper**: Seamlessly wraps the Stable Diffusion WebUI Forge API
- **🚫 No Gradio**: Abandons the legacy Gradio interface for a purpose-built experience
- **⚡ Fast & Lightweight**: Optimized frontend with minimal dependencies

ViteUI focuses on delivering the best possible user experience while maintaining full compatibility with the powerful Forge backend ecosystem.

## 📋 Prerequisites

- **Node.js 18+** and **npm** (for the ViteUI frontend)
- **Python 3.10+** (for the Forge backend API)
- **CUDA-compatible GPU** (recommended for image generation)
- **Git** for cloning

## 🚀 Getting Started

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd stable-diffusion-viteui-forge
```

### 2. Install Dependencies

```bash
# Install Python dependencies (backend)
pip install -r requirements_versions.txt

# Install Node.js dependencies (frontend)
cd client && npm install && cd ..
```

### 3. Start Development

```bash
# Full development stack (backend + frontend dev server)
python viteui.py --viteui

# Frontend development only (requires backend running separately)
cd client && npm run dev

# Backend API only
python viteui.py
```

**Access Points:**
- **🎨 ViteUI Interface**: `http://localhost:5173`
- **🔌 Forge API**: `http://localhost:7861`
- **📚 API Documentation**: `http://localhost:7861/docs`

## 🎯 Key Features

- **🎨 Modern Vite Interface**: Clean, responsive React UI built with modern web technologies
- **🔌 Forge API Integration**: Full compatibility with Stable Diffusion WebUI Forge backend
- **⚡ Real-time Generation**: Live progress updates and previews via WebSocket
- **🖌️ Advanced Prompting**: Visual prompt composer with tag-based system
- **🎯 Canvas Editor**: Interactive image-to-image workflows
- **📱 Mobile Responsive**: Optimized for desktop and mobile devices

### 🗂️ Workspace Management System
- **📁 Organized Projects**: Create and manage multiple workspaces for different projects
- **🔄 Image Lifecycle**: Track images through candidates → commits → rejects workflow
- **📂 Hierarchical Folders**: Nested folder structure for complex project organization
- **🖼️ Auto-Generated Previews**: Automatic thumbnail generation and metadata storage
- **💾 Persistent Storage**: Structured file organization with backup and versioning support

### ⏱️ Timeline System
- **📊 Generation History**: Visual timeline of all generated images in sequence
- **✅ Commit/Reject Workflow**: Review and organize generated images with one-click actions
- **🔍 Quick Navigation**: Browse and select from recent generations instantly
- **🆙 Upscale Integration**: Direct upscaling capabilities from timeline items
- **🎯 Active Selection**: Highlight and manage current working image

## 📁 Project Structure

```
stable-diffusion-viteui-forge/
├── client/               # ViteUI React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # State management
│   │   └── api.ts        # Forge API client
│   ├── package.json
│   └── vite.config.ts
├── backend/              # Python backend (Forge)
├── modules/              # Core Forge modules
├── modules_forge/        # Forge-specific modules
├── extensions-builtin/   # Built-in extensions
├── models/               # Model storage
├── original-forge/       # Reference copy (read-only)
├── requirements_versions.txt
├── viteui.py             # Main launch script
├── viteui.bat            # Windows launcher
└── vite.bat              # Frontend dev server launcher
```

## 🔧 Development

### Client Development

```bash
# Frontend development (requires backend running separately)
cd client
npm run dev -- --port 5174  # Use port 5174 to avoid conflicts

# Build for production testing
npm run build
```

### API Testing

```bash
# Health check
curl http://localhost:7861/health

# List models
curl http://localhost:7861/sdapi/v1/sd-models

# Generate image
curl -X POST http://localhost:7861/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{"prompt": "beautiful landscape", "steps": 20}'
```

### Environment Setup

Create `client/.env` for frontend configuration:

```env
VITE_API_BASE_URL=http://localhost:7861
VITE_WS_URL=ws://localhost:7861/ws
```

## 🚀 Deployment

### Production Build

```bash
# Build frontend for production
cd client && npm run build && cd ..

# Start production server
python viteui.py --port 7861 --listen
```

The server serves both the built ViteUI frontend and Forge API from the same port.

### Docker Support

Multi-stage Docker build available for containerized deployment with built-in frontend and backend.

## 🤝 Contributing

We welcome contributions to improve ViteUI! Focus areas:

- **Frontend Enhancements**: UI/UX improvements, new features, performance optimizations
- **API Integration**: Better Forge API integration and wrapper improvements
- **Documentation**: Improved setup and usage guides

## 📄 Documentation

- **Client Development**: See `client/README.md`
- **API Reference**: Available at `/docs` when running the backend
- **Forge Compatibility**: Full compatibility with WebUI Forge extensions

## 📝 License

Licensed under AGPL-3.0 - see [LICENSE](LICENSE.txt) for details.

## 🙏 Acknowledgments

- **lllyasviel** for the amazing Stable Diffusion WebUI Forge backend
- **AUTOMATIC1111** for the original Stable Diffusion WebUI and API design
- **React & Vite** communities for modern web development tools
- **FastAPI** for the robust backend framework

---

**Ready to create amazing AI art?** Choose your path - use the full studio interface or integrate the powerful API into your applications! 🎨🚀✨