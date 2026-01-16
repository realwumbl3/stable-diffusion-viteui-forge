# Inpainting Implementation Plan

## Overview
This document outlines the plan to implement inpainting functionality in the Vite React rewrite of the Stable Diffusion client. The original Gradio-based implementation already supports inpainting via the img2img API with mask parameters. This plan focuses on building a modern, intuitive inpainting UI in React while minimizing backend changes.

## Current State Analysis

### Backend (Already Supports Inpainting)
- **API Endpoint**: `/sdapi/v1/img2img` already accepts `mask` parameter (base64 string)
- **Processing**: `StableDiffusionProcessingImg2Img` class handles:
  - `mask`: Image mask (RGBA or L format)
  - `mask_blur`: Blur amount for mask edges (default: 4)
  - `inpainting_fill`: Fill mode (0=fill, 1=original, 2=latent noise, 3=latent nothing)
  - `inpaint_full_res`: Whether to process at full resolution (default: True)
  - `inpaint_full_res_padding`: Padding for full-res mode (default: 0)
  - `inpainting_mask_invert`: Invert mask (0=normal, 1=inverted)
- **No backend changes required** - all functionality exists via API

### Frontend (Current State)
- Supports `txt2img` and `img2img` modes
- Canvas component displays images with zoom/pan
- PropertiesPanel has basic img2img controls (input image, denoising strength)
- No mask drawing/editing capabilities
- No inpainting-specific UI

## Implementation Plan

### Phase 1: Core Inpainting Mode & API Integration

#### 1.1 Add Inpainting Mode to App State
**File**: `client/src/App.jsx`
- Add `'inpaint'` to generation modes
- Add state for:
  - `inpaintMask`: base64 mask image (null when not set)
  - `maskBlur`: number (default: 4)
  - `inpaintingFill`: number (0-3, default: 0)
  - `inpaintFullRes`: boolean (default: true)
  - `inpaintFullResPadding`: number (default: 0)
  - `inpaintingMaskInvert`: boolean (default: false)
- Update `generateImage()` to handle inpainting mode:
  - Validate that both `inputImage` and `inpaintMask` are set
  - Include mask and inpainting parameters in API call

#### 1.2 Update API Client
**File**: `client/src/api.js`
- No changes needed - `img2img()` already accepts all parameters
- Ensure mask is sent as base64 string in `mask` field

#### 1.3 Update Header Component
**File**: `client/src/components/Header.jsx`
- Add 'Inpaint' option to generation mode selector
- Add keyboard shortcut: `alt+n` for inpainting mode

### Phase 2: Canvas Mask Drawing Tools

#### 2.1 Create Mask Drawing Component
**New File**: `client/src/components/InpaintCanvas.jsx`
- Extend or wrap existing Canvas component
- Add drawing tools:
  - **Brush Tool**: Draw mask with adjustable size
  - **Eraser Tool**: Erase parts of mask
  - **Fill Tool**: Fill connected areas
  - **Clear Tool**: Clear entire mask
- Features:
  - Brush size slider (4-64px)
  - Real-time preview of mask overlay (red/transparent overlay)
  - Undo/Redo support (optional, nice-to-have)
  - Export mask as base64 image
- Use HTML5 Canvas API for drawing
- Store mask as separate canvas layer, composite with image for display

#### 2.2 Canvas State Management
- Track drawing mode: 'brush' | 'erase' | 'fill' | 'clear'
- Track brush size, opacity
- Maintain mask canvas separate from image canvas
- Convert mask canvas to base64 PNG when needed

#### 2.3 Integration with Existing Canvas
**Option A**: Create separate InpaintCanvas component
- Switch between Canvas and InpaintCanvas based on mode
- Cleaner separation of concerns

**Option B**: Add drawing capabilities to existing Canvas
- Add drawing mode state
- Conditionally render drawing tools
- More code reuse but potentially more complex

**Recommendation**: Option A for cleaner architecture

### Phase 3: Properties Panel Inpainting Controls

#### 3.1 Add Inpainting Section
**File**: `client/src/components/PropertiesPanel.jsx`
- Add new section or expand img2img section when mode is 'inpaint'
- Controls to add:
  - **Mask Blur**: Slider (0-64, default: 4)
    - Description: "Blurs the edges of the mask for smoother transitions"
  - **Masked Content**: Dropdown/Radio
    - Options:
      - "Fill" (0): Fill masked area with content
      - "Original" (1): Keep original image in masked area
      - "Latent Noise" (2): Use latent noise
      - "Latent Nothing" (3): Use empty latent
    - Default: "Fill"
  - **Inpaint at Full Resolution**: Toggle (default: true)
    - Description: "Process the masked area at full resolution"
  - **Full Resolution Padding**: Number input (0-256, default: 0)
    - Only visible when "Inpaint at Full Resolution" is enabled
    - Description: "Padding around the masked area"
  - **Invert Mask**: Toggle (default: false)
    - Description: "Invert the mask (paint what to keep instead of what to change)"

#### 3.2 Mask Upload Option
- Add "Upload Mask" button in PropertiesPanel
- Allow users to upload a mask image file
- Convert uploaded mask to base64 and set as `inpaintMask`
- Validate mask dimensions match input image

### Phase 4: UI/UX Enhancements

#### 4.1 Visual Feedback
- Show mask overlay on canvas (red/transparent)
- Toggle mask visibility button
- Show brush cursor when in drawing mode
- Display mask preview thumbnail in PropertiesPanel

#### 4.2 Toolbar for Drawing Tools
**New Component**: `client/src/components/InpaintToolbar.jsx`
- Brush tool button
- Eraser tool button
- Fill tool button
- Clear mask button
- Brush size slider
- Undo/Redo buttons (optional)
- Mask visibility toggle

#### 4.3 Canvas Interaction
- Mouse/touch support for drawing
- Pressure sensitivity (if supported by device)
- Smooth brush strokes (interpolate between points)
- Snap to grid option (optional)

### Phase 5: Advanced Features (Future Enhancements)

#### 5.1 Mask Refinement
- Feather edges
- Expand/contract mask
- Smooth mask
- Invert mask locally

#### 5.2 Mask Presets
- Common shapes (circle, rectangle, polygon)
- Quick selection tools (magic wand style)

#### 5.3 Mask History
- Save/load masks
- Multiple mask layers (future)

## Technical Implementation Details

### Mask Format
- Store mask as RGBA image (alpha channel = mask)
- Convert to grayscale (L) when sending to API
- API expects base64 encoded PNG

### Drawing Implementation
```javascript
// Pseudo-code for mask drawing
class MaskCanvas {
  constructor(imageCanvas, maskCanvas) {
    this.imageCanvas = imageCanvas; // Source image
    this.maskCanvas = maskCanvas;  // Mask layer
    this.overlayCanvas = overlayCanvas; // Composite view
  }
  
  drawBrush(x, y, size, mode) {
    // Draw on mask canvas
    // Update overlay to show mask + image
  }
  
  exportMask() {
    // Convert mask canvas to base64 PNG
    return this.maskCanvas.toDataURL('image/png');
  }
}
```

### API Request Format
```javascript
{
  // ... existing img2img parameters
  init_images: [base64Image],
  mask: base64Mask, // Base64 PNG string
  mask_blur: 4,
  inpainting_fill: 0,
  inpaint_full_res: true,
  inpaint_full_res_padding: 0,
  inpainting_mask_invert: 0,
  denoising_strength: 0.75
}
```

## File Structure

```
client/src/
├── components/
│   ├── Canvas.jsx (existing)
│   ├── InpaintCanvas.jsx (new)
│   ├── InpaintToolbar.jsx (new)
│   ├── PropertiesPanel.jsx (modify)
│   └── Header.jsx (modify)
├── App.jsx (modify)
└── api.js (no changes needed)
```

## Testing Checklist

- [ ] Can switch to inpainting mode
- [ ] Can draw mask on canvas
- [ ] Can erase mask
- [ ] Can clear mask
- [ ] Mask overlay displays correctly
- [ ] Can upload mask image
- [ ] Mask parameters are sent correctly to API
- [ ] Inpainting generation works end-to-end
- [ ] Mask blur parameter works
- [ ] Fill mode parameter works
- [ ] Full resolution toggle works
- [ ] Mask invert works
- [ ] Error handling for missing mask/image
- [ ] Responsive design on mobile/tablet

## Backend Changes Required

**None** - The backend already fully supports inpainting via the existing img2img API endpoint. All required parameters are already accepted and processed.

## Migration Notes

- Existing img2img functionality remains unchanged
- Inpainting is an additional mode, not a replacement
- Users can still use img2img without masks
- Mask drawing is only available in inpainting mode

## Performance Considerations

- Use requestAnimationFrame for smooth drawing
- Debounce mask export to base64 (only when needed)
- Consider Web Workers for mask processing if needed
- Optimize canvas redraws (only redraw changed regions)

## Accessibility

- Keyboard shortcuts for all tools
- Screen reader support for tool labels
- High contrast mode support
- Touch-friendly controls for mobile

## Future Enhancements

1. **Smart Masking**: AI-assisted mask generation
2. **Mask Library**: Save/load common masks
3. **Batch Inpainting**: Process multiple images with same mask
4. **Mask Templates**: Pre-defined mask shapes
5. **Advanced Brush Options**: Different brush shapes, textures
6. **Mask Layers**: Multiple mask layers with blend modes

## Timeline Estimate

- **Phase 1**: 2-3 days (Core mode & API integration)
- **Phase 2**: 4-5 days (Canvas drawing tools)
- **Phase 3**: 2-3 days (Properties panel)
- **Phase 4**: 2-3 days (UI/UX polish)
- **Total**: ~10-14 days for MVP

## Dependencies

No new npm packages required - can use existing React, HTML5 Canvas API, and existing UI components.

## Notes

- Keep mask drawing simple initially - can add advanced features later
- Focus on core workflow: draw mask → set parameters → generate
- Ensure mobile/tablet support for touch drawing
- Consider using a canvas library (like fabric.js or konva.js) if native canvas becomes too complex, but try native first
