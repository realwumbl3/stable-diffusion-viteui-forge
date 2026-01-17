# Timeline Upscale Feature Implementation Plan

## Overview
This document outlines the plan to implement an upscale feature for timeline entries. Users should be able to upscale images from committed timeline entries or the current canvas image, with the upscaled result appearing in the generations queue for review and commitment.

## Feature Requirements

### Core Functionality
1. **Upscale Button**: Add an upscale button in the top right of timeline entries
2. **Upscale Dialog**: Small dialog with:
   - Radio selection for upscale filter (upscaler_1)
   - Scale buttons: 1.5x, 2x, 3x, 4x
3. **Generation Integration**: Upscaled results appear in generations queue like inpaint/img2img results
4. **Workflow**: Users can commit or reject upscaled images like other generations

### Target Locations
- Committed timeline entries (historical images)
- Current canvas image (via timeline preview)

### User Experience
- Click upscale button → dialog opens
- Select upscaler and scale factor
- Upscale generates and appears in generation queue
- Review, commit, or reject like other generations

## Implementation Plan

### Phase 1: API Integration & State Management

#### 1.1 Add Upscale API to Api.ts
**File**: `client/src/Api.ts`
- Add `extraSingleImage()` method for upscaling
- Define `ExtrasSingleImageParams` interface
- Parameters needed:
  - `image`: base64 string
  - `upscaler_1`: upscaler name (from getUpscalers())
  - `upscaling_resize`: scale factor (1.5, 2, 3, 4)
  - `resize_mode`: 0 (scale by factor)

```typescript
export interface ExtrasSingleImageParams {
  image: string;
  upscaler_1: string;
  upscaling_resize: number;
  resize_mode: number;
}

async extraSingleImage(params: ExtrasSingleImageParams): Promise<GenerationResponse> {
  // Implementation using /sdapi/v1/extra-single-image
}
```

#### 1.2 Add Upscale State to App
**File**: `client/src/App.jsx`
- Add upscale dialog state:
```javascript
const [upscaleDialog, setUpscaleDialog] = useState({
  isOpen: false,
  sourceImage: null, // {id, image, type: 'timeline'|'canvas'}
  selectedUpscaler: 'Lanczos', // default upscaler
});
```

#### 1.3 Upscale Handler
- Add `handleUpscale()` function that:
  - Calls API with selected parameters
  - Adds result to generation queue (like img2img/inpaint)
  - Auto-previews the upscaled result

### Phase 2: Upscale Dialog Component

#### 2.1 Create UpscaleDialog Component
**New File**: `client/src/components/UpscaleDialog.jsx`
- Modal/dialog component
- Radio buttons for upscaler selection (fetched from API)
- Scale buttons: 1.5x, 2x, 3x, 4x
- Confirm/Cancel buttons
- Loading state during upscale

#### 2.2 Fetch Available Upscalers
- On dialog open, fetch upscalers using `api.getUpscalers()`
- Populate radio options with upscaler names
- Default to 'Lanczos' or first available

### Phase 3: Timeline Item Modifications

#### 3.1 Add Upscale Button to TimelineItem
**File**: `client/src/components/TimelineItem.jsx`
- Add upscale button in top right (next to existing discard button)
- Only show for committed timeline items and canvas previews
- Position: top-right corner, use icon (zoom-in, maximize, etc.)
- Handler: opens upscale dialog with source image

```jsx
{showUpscale && (
  <button
    onClick={(event) => {
      event.stopPropagation();
      onUpscale?.();
    }}
    className="absolute top-1 right-1 rounded bg-studio-panel/80 text-studio-textSecondary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
    title="Upscale"
    type="button"
  >
    <Maximize2 size={12} /> {/* or ZoomIn icon */}
  </button>
)}
```

#### 3.2 Pass Upscale Handler to TimelineItem
**File**: `client/src/components/TimelineSidebar.jsx`
- Add `onUpscale` prop to TimelineItem components
- Handler opens upscale dialog with the timeline item

### Phase 4: Integration with Generation Flow

#### 4.1 Upscale Result Handling
**File**: `client/src/App.jsx`
- Modify generation result handler to support upscale results
- Add upscaled images to generation queue with type: 'upscale'
- Auto-preview upscaled results

#### 4.2 Canvas Integration
- Ensure upscaled images work with existing commit/reject workflow
- Maintain mask visibility behavior (off for previews)

### Phase 5: UI/UX Polish

#### 5.1 Dialog Styling
- Small, compact dialog
- Radio buttons for upscaler selection
- Large scale buttons (1.5x, 2x, 3x, 4x) for easy clicking
- Loading spinner during upscale process

#### 5.2 Visual Feedback
- Button hover states
- Dialog animations
- Progress indication during upscale

#### 5.3 Error Handling
- Handle upscale failures gracefully
- Show error messages in dialog
- Allow retry on failure

## Technical Implementation Details

### API Request Format
```javascript
{
  image: "base64string...",
  upscaler_1: "Lanczos",
  upscaling_resize: 2.0,
  resize_mode: 0
}
```

### Component Hierarchy
```
App
├── UpscaleDialog
├── TimelineSidebar
    └── TimelineItem (with upscale button)
```

### State Flow
1. User clicks upscale button on TimelineItem
2. Opens UpscaleDialog with source image
3. User selects upscaler and scale factor
4. Calls api.extraSingleImage()
5. Result added to generationQueue
6. Auto-previewed in canvas
7. User can commit or reject like other generations

## File Structure Changes

```
client/src/
├── Api.ts (modify - add extraSingleImage method)
├── App.jsx (modify - add upscale state & handlers)
├── components/
│   ├── UpscaleDialog.jsx (new)
│   ├── TimelineItem.jsx (modify - add upscale button)
│   └── TimelineSidebar.jsx (modify - pass upscale handler)
```

## Testing Checklist

- [ ] Upscale button appears on timeline items
- [ ] Dialog opens with upscaler options and scale buttons
- [ ] Upscalers are fetched and displayed correctly
- [ ] Clicking scale buttons triggers upscale
- [ ] Upscaled result appears in generation queue
- [ ] Upscaled image can be committed/rejected like other generations
- [ ] Error handling works for failed upscales
- [ ] Dialog closes after successful upscale
- [ ] UI is responsive on mobile/tablet

## Backend Requirements

**None** - Uses existing `/sdapi/v1/extra-single-image` endpoint which is already implemented.

## Dependencies

- Add `lucide-react` icon (Maximize2 or ZoomIn) if not already available
- Existing UI components and styling

## Timeline Estimate

- **Phase 1**: 1-2 days (API integration & state management)
- **Phase 2**: 1-2 days (Dialog component)
- **Phase 3**: 1 day (Timeline integration)
- **Phase 4**: 1 day (Generation flow integration)
- **Phase 5**: 1-2 days (Polish & testing)
- **Total**: ~5-8 days

## Notes

- Keep dialog small and focused - just upscaler selection and scale buttons
- Use existing generation queue/commit workflow for consistency
- Default to simple upscaler (Lanczos) for most users
- Consider adding keyboard shortcuts for power users
- Test with various image sizes and upscaler combinations