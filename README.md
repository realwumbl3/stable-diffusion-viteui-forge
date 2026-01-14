# 🚀 Stable Diffusion API Server

> **Pure API Service for Stable Diffusion** - A streamlined, API-only version of Stable Diffusion WebUI Forge that provides FastAPI endpoints for image generation without any web UI overhead.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://www.python.org/)

## ✨ What is This?

**Stable Diffusion API Server** is a pure API service based on [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) that provides RESTful and WebSocket endpoints for stable diffusion image generation. No web UI is included - this is designed to be consumed by external applications and services.

### 🚀 Key Features

- **🎯 Pure API**: Clean RESTful endpoints with OpenAPI documentation
- **⚡ High Performance**: No UI overhead, optimized for server deployment
- **🔌 WebSocket Support**: Real-time progress updates and notifications
- **📚 Full Documentation**: Interactive API docs at `/docs`
- **🛠️ Developer Friendly**: Well-structured endpoints for easy integration
- **🔧 Extensible**: Full extension support maintained

## 📋 Prerequisites

- **Node.js 18+** and **npm** or **yarn**
- **Python 3.10+** for the backend
- **CUDA-compatible GPU** (recommended for generation)
- **Git** for cloning repositories

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/realwumbl3/stable-diffusion-api-server.git
cd stable-diffusion-api-server
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements_versions.txt
```

### 3. Start the API Server

```bash
# On Windows
nowebui.bat

# On Linux/Mac
python launch.py
```

The API server will start on `http://localhost:7861` with:
- **API Documentation**: `http://localhost:7861/docs`
- **WebSocket Progress**: `ws://localhost:7861/ws`
- **Health Check**: `http://localhost:7861/health`

## 🎯 Features

### RESTful API Endpoints
- **Image Generation**: Text-to-image with advanced parameters
- **Image-to-Image**: Transform existing images with prompts
- **Model Management**: Load, switch, and manage models
- **Progress Tracking**: Real-time generation progress via WebSocket
- **Extension Support**: Full compatibility with Forge extensions

### API Documentation
- **OpenAPI/Swagger**: Interactive API documentation at `/docs`
- **Request/Response Examples**: Complete with sample payloads
- **Authentication Support**: API key and token-based auth
- **Rate Limiting**: Configurable request limits

### Production Ready
- **High Performance**: Optimized for server deployment
- **Concurrent Requests**: Queue-based processing system
- **Health Monitoring**: Built-in health checks and metrics
- **Docker Support**: Container-ready deployment
- **Logging**: Comprehensive request and error logging

## 📁 Project Structure

```
stable-diffusion-api-server/
├── backend/               # Python backend (Forge)
├── modules/               # Core modules
├── modules_forge/         # Forge-specific modules
├── extensions-builtin/    # Built-in extensions
├── models/                # Model storage directory
├── requirements_versions.txt
├── webui.py              # Main API entry point
├── launch.py             # Launch script
└── nowebui.bat          # Windows launcher
```

## 🔧 Development

### API Development

```bash
# Install dependencies
pip install -r requirements_versions.txt

# Run the API server
python launch.py

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

### Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_API_BASE_URL=http://localhost:7861
VITE_API_DOCS_URL=http://localhost:7861/docs
```

## 🚀 Deployment

### Production Server

```bash
# Install dependencies
pip install -r requirements_versions.txt

# Start production server
python launch.py --port 7861 --listen
```

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements_versions.txt .
RUN pip install -r requirements_versions.txt

COPY . .
EXPOSE 7861

CMD ["python", "launch.py", "--port", "7861", "--listen"]
```

### Reverse Proxy Configuration

For production deployments, use a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:7861;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

This project is not affiliated with the original Stable Diffusion WebUI Forge project. It is an independent fork focused on providing a clean API-only interface.

## 🙏 Acknowledgments

- **lllyasviel** for the amazing Stable Diffusion WebUI Forge backend
- **AUTOMATIC1111** for the original Stable Diffusion WebUI and API design
- **FastAPI** community for the excellent web framework

---

**Ready to integrate Stable Diffusion into your applications?** Get started with the Quick Start guide above! 🚀✨