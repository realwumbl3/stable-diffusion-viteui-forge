# Strip-Web-UI Plan: Convert to API-Only Stable Diffusion Service

## Overview
This plan outlines the systematic removal of all frontend components from the stable-diffusion-webui-forge project, transforming it into a pure API-only stable diffusion service that can be used to build external web UI applications.

## Current Architecture Analysis
- **Dual Interface**: Project currently supports both Gradio-based web UI and FastAPI-based API
- **Entry Points**: `webui.py` contains `webui_worker()` (full UI) and `api_only_worker()` (API-only)
- **Existing API Mode**: `--nowebui` flag already enables API-only mode
- **Frontend Components**: HTML templates, JavaScript files, CSS, Gradio UI components
- **Backend Components**: Core stable diffusion processing in `backend/` folder

## Phase 1: Remove Frontend Assets & Dependencies

### 1.1 Remove Frontend Files & Directories
- Delete entire `html/` directory (HTML templates)
- Delete entire `javascript/` directory (JS components)
- Delete `style.css` and `script.js` (main web assets)
- Delete `package.json` (frontend package management)
- Delete `styles_integrated.csv` (integrated styles)

### 1.2 Clean Requirements
- Remove `gradio==4.40.0` from `requirements_versions.txt`
- Remove `gradio_rangeslider==0.0.6`
- Remove `gradio_imageslider==0.0.20`
- Keep `fastapi==0.104.1` and other API/backend dependencies

## Phase 2: Remove UI-Related Modules

### 2.1 Delete UI Modules from `/modules/`
Remove all `ui_*.py` files:
- `ui.py`, `ui_checkpoint_merger.py`, `ui_common.py`, `ui_components.py`
- `ui_extensions.py`, `ui_extra_networks*.py`, `ui_gradio_extensions.py`
- `ui_loadsave.py`, `ui_postprocessing.py`, `ui_prompt_styles.py`
- `ui_settings.py`, `ui_tempdir.py`, `ui_toprow.py`

### 2.2 Delete Gradio-Related Modules
- `gradio_extensions.py`
- `shared_gradio_themes.py`

### 2.3 Clean modules_forge/
- Delete `forge_canvas/` directory (canvas UI components)
- Delete `gradio_compile.py` (Gradio compilation)

## Phase 3: Remove UI-Related Extensions

### 3.1 Remove UI-Only Builtin Extensions
Delete extensions that are purely UI/frontend:
- `mobile/` (mobile UI components)
- `prompt-bracket-checker/` (UI validation)

### 3.2 Clean ControlNet & Other Extensions
Remove UI components from extensions that have both API and UI parts:
- In `sd_forge_controlnet/`: remove JS files, keep Python API logic
- Similar cleanup for other extensions with mixed UI/API functionality

## Phase 4: Modify Core Application Logic

### 4.1 Update `webui.py`
- Remove `webui_worker()` function entirely
- Remove `webui()` function
- Keep only `api_only_worker()` and rename it to `main_worker()`
- Update main execution to always run API-only mode
- Remove Gradio imports and UI setup code

### 4.2 Update Launch Scripts
- Modify `webui.bat` and `webui.sh` to default to API-only mode
- Remove `--nowebui` flag logic (make it the default)
- Update `launch.py` to always launch API server

### 4.3 Clean Command Line Arguments
- Remove UI-related command line options from `cmd_args.py`:
  - `--api` (make API the default)
  - UI theming options
  - Browser launch options
  - Gradio-specific options

## Phase 5: Clean Imports & Dependencies

### 5.1 Update API Module
- Remove Gradio imports from `modules/api/api.py`
- Clean any UI-related dependencies in API endpoints
- Ensure all API endpoints work without Gradio context

### 5.2 Clean Shared Modules
- Remove UI references from `shared.py` and related shared modules
- Update initialization to skip UI setup
- Remove Gradio demo object management

### 5.3 Update Script Callbacks
- Remove UI-related callback hooks
- Keep only API and processing callbacks

## Phase 6: Update Configuration & Documentation

### 6.1 Update README
- Change documentation to focus on API usage
- Remove web UI setup instructions
- Add API endpoint documentation
- Update launch instructions for API-only mode

### 6.2 Update Configuration Files
- Remove UI-related options from configuration
- Update default settings for API-only operation
- Clean extension configurations

## Phase 7: API Enhancement (Optional)

### 7.1 Enhance API Interface
- Consider adding OpenAPI/Swagger documentation
- Add API versioning if needed
- Implement proper CORS for external web app access
- Add health check endpoints

### 7.2 Add API Utilities
- Create API client libraries/examples
- Add request/response validation
- Implement rate limiting if needed

## Phase 8: Testing & Validation

### 8.1 Test API Endpoints
- Verify all stable diffusion endpoints work
- Test model loading and switching
- Validate image generation workflows
- Check extension API integrations

### 8.2 Clean Dependencies
- Run dependency analysis to remove unused packages
- Update requirements to remove frontend dependencies
- Test installation in clean environment

## Key Benefits

1. **Pure API Focus**: Eliminates all frontend complexity
2. **Lighter Footprint**: Removes Gradio and UI dependencies
3. **External UI Flexibility**: Allows building any web UI on top of the API
4. **Better Performance**: No UI rendering overhead
5. **Maintains Full Functionality**: All SD processing capabilities preserved

## Migration Path for Users

- **Existing API consumers**: No changes needed
- **Web UI users**: Can build external web apps using the API
- **Extensions**: API parts remain functional, UI parts removed

## Implementation Notes

- **Preserve Backend**: Keep all `backend/` folder contents intact
- **Maintain API**: Ensure `modules/api/` endpoints remain fully functional
- **Clean Dependencies**: Remove any packages only used by frontend components
- **Test Thoroughly**: Validate all stable diffusion workflows work through API

This plan transforms the project from a web application with API to a dedicated stable-diffusion API service that can power external web UI applications.