# 🎨 Stable Diffusion ViteUI Forge

> **Modern React UI for Stable Diffusion WebUI Forge** - A complete rewrite of the user interface using React, Vite, and modern web technologies for a faster, more responsive, and professional experience.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC)](https://tailwindcss.com/)

## ✨ What is This?

**Stable Diffusion ViteUI Forge** is a modern fork of [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) that replaces the traditional Gradio interface with a sleek, responsive React application built with cutting-edge web technologies.

### 🚀 Key Improvements

- **⚡ Lightning Fast**: Built with Vite for instant hot reloading and optimized builds
- **🎨 Modern Design**: Clean, professional UI inspired by contemporary web applications
- **📱 Responsive**: Optimized for desktop, tablet, and mobile devices
- **🔧 Developer Friendly**: Modern JavaScript/TypeScript with hot module replacement
- **🎯 Enhanced UX**: Intuitive workflows and real-time parameter adjustments
- **🖼️ Advanced Canvas**: Professional drawing and editing tools

## 📋 Prerequisites

- **Node.js 18+** and **npm** or **yarn**
- **Python 3.10+** for the backend
- **CUDA-compatible GPU** (recommended for generation)
- **Git** for cloning repositories

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/realwumbl3/stable-diffusion-viteui-forge.git
cd stable-diffusion-viteui-forge
```

### 2. Backend Setup (Forge API)

```bash
# Install Python dependencies
pip install -r requirements_versions.txt

# Start the Forge backend API
python webui.py --port 7861 --api --no-gradio
```

The API will be available at `http://localhost:7861` with documentation at `http://localhost:7861/docs`.

### 3. Frontend Setup (React UI)

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The React UI will be available at `http://localhost:5173` and will connect to the Forge API automatically.

## 🎯 Features

### Modern React Interface
- **Component-Based Architecture**: Modular, reusable components
- **State Management**: Efficient state handling with React hooks
- **Real-time Updates**: Live parameter adjustments and previews
- **Professional Styling**: Tailwind CSS for consistent, modern design

### Enhanced User Experience
- **Intuitive Navigation**: Clean, organized interface layout
- **Advanced Canvas Tools**: Drawing, masking, and image editing
- **Responsive Design**: Works seamlessly across all devices
- **Keyboard Shortcuts**: Productivity-boosting hotkeys
- **Dark/Light Themes**: Customizable appearance

### Developer Experience
- **Hot Module Replacement**: Instant updates during development
- **TypeScript Support**: Type-safe development
- **ESLint & Prettier**: Code quality and formatting
- **Modern Build Tools**: Vite for fast development and optimized production builds

## 📁 Project Structure

```
stable-diffusion-viteui-forge/
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── vite.config.js
├── backend/               # Python backend (Forge)
├── modules_forge/         # Forge-specific modules
├── .newui/               # UI development planning docs
├── requirements_versions.txt
└── webui.py              # Main backend entry point
```

## 🔧 Development

### Frontend Development

```bash
cd client
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Development

The backend is based on Stable Diffusion WebUI Forge. For backend development and API documentation, refer to the [original Forge repository](https://github.com/lllyasviel/stable-diffusion-webui-forge).

### Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_API_BASE_URL=http://localhost:7861
VITE_API_DOCS_URL=http://localhost:7861/docs
```

## 🚀 Deployment

### Building for Production

```bash
# Build the React app
cd client
npm run build

# The built files will be in client/dist/
# Serve these files with any static file server
```

### Docker Support

Coming soon - Docker configuration for easy deployment.

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

## 📝 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE.txt) file for details.

## ⚠️ Disclaimer

This project is not affiliated with the original Stable Diffusion WebUI Forge project. It is an independent fork focused on UI modernization.

## 🙏 Acknowledgments

- **lllyasviel** for the amazing Stable Diffusion WebUI Forge backend
- **AUTOMATIC1111** for the original Stable Diffusion WebUI
- **React & Vite communities** for the fantastic development tools

---

**Ready to experience Stable Diffusion with a modern UI?** Get started with the Quick Start guide above! 🎨✨