// VITE UI
import type { Generation } from '../Api'
import type { PromptNode } from '../components/PromptComposer/types'

// Timeline types
export interface Timeline {
  generationQueue: Generation[]
  currentPreview: Generation | null
  committedHistory: Generation[]
  discarded: Generation[]
}

// Generation mode type
export type GenerationMode = 'txt2img' | 'img2img' | 'inpaint'

// Progress type
export interface Progress {
  progress: number
  current_batch?: number
  total_batches?: number
  [key: string]: unknown
}

export interface CanvasTopControlsProps {
  loading: boolean
  progress: Progress | null
  onGenerate: () => void
  canGenerate: boolean
  onSkip: () => void
  onRestart: () => void
  onInterrupt: () => void
  pendingRestart: boolean
  steps: number
  setSteps: (value: number) => void
  count: number
  setCount: (value: number) => void
  width: number
  setWidth: (value: number) => void
  height: number
  setHeight: (value: number) => void
  inputImage: string | null
  pageLocked: boolean
  onToggleLock: () => void
}

// Sidebar component props
export interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  timeline: Timeline
  currentImage: string | null
  onPreviewSelect: (generation: Generation | null) => void
  onCommitPreview: () => void
  onRejectPreview: () => void
  onDiscardGeneration: (generation: Generation) => void
  onRestoreGeneration: (generation: Generation) => void
  onUncommitGeneration: (generation: Generation) => void
  onGenerationModeChange: (mode: GenerationMode) => void
  generationMode: GenerationMode
  onUpscale: (item: { id: string; image: string; type: 'timeline' | 'canvas' }) => void
  getGenerationImageUrl?: (generation: Generation | null) => string | null
  onRefreshTimeline?: () => void
  onRefreshCanvas?: () => void
  canvasRefreshKey: number
}

// Workspace structure node type
export interface WorkspaceStructureNode {
  name: string
  path: string
  type: 'workspace' | 'folder'
  children: WorkspaceStructureNode[]
}

// WorkspaceBrowser component props
export interface WorkspaceBrowserProps {
  currentWorkspace: string | null
  onSelectWorkspace: (workspace: string) => void
  onClose: () => void
}

// WorkspaceTabs component props
export interface WorkspaceTabsProps {
  openWorkspaces: string[]
  currentWorkspace: string | null
  onWorkspaceChange: (workspace: string) => void
  onWorkspaceClose: (workspace: string) => void
  onCreateWorkspace: (name: string) => void
  onOpenWorkspaceBrowser: () => void
}

// TimelineItem component props
export interface TimelineItemProps {
  item: Generation
  isActive: boolean
  onSelect: () => void
  onDiscard?: () => void
  onCommit?: () => void
  onReject?: () => void
  onUpscale?: (item: Generation) => void
  showDiscard?: boolean
  showCommitReject?: boolean
  showUpscale?: boolean
  commitLabel?: string
  badge?: React.ReactNode | null
  getGenerationImageUrl?: (item: Generation, kind?: 'preview' | 'full') => string | null
}

// NumberSelector component props
export interface NumberSelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
}

// OptionPicker component props
export interface OptionPickerProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  title?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

// ResolutionPicker component props
export interface ResolutionPickerProps {
  width: number
  setWidth: (value: number) => void
  height: number
  setHeight: (value: number) => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
  className?: string
  inputImage?: string | null
}

// ResolutionIndicator component props
export interface ResolutionIndicatorProps {
  width: number
  setWidth: (value: number) => void
  height: number
  setHeight: (value: number) => void
  inputImage: string | null
}

// PropertiesPanel component props
export interface PropertiesPanelProps {
  collapsed: boolean
  onToggle: () => void
  generationMode: GenerationMode
  setGenerationMode: (mode: GenerationMode) => void
  width: number
  setWidth: (value: number) => void
  height: number
  setHeight: (value: number) => void
  batchSize: number
  setBatchSize: (value: number) => void
  denoisingStrength: number
  setDenoisingStrength: (value: number) => void
  inputImage: string | null
  onImageUpload: (image: string | null) => void
  clipSkip?: number
  onClipSkipChange?: (value: number) => void
  saveImages: boolean
  setSaveImages: (value: boolean) => void
}

// ImageUploader component props
export interface ImageUploaderProps {
  inputImage?: string | null
  onImageUpload: (image: string) => void
  loading?: boolean
  progress?: Progress | null
  className?: string
}

// Welcome component props
export interface WelcomeProps {
  onGetStarted: () => void
}

// CreateWorkspaceDialog component props
export interface CreateWorkspaceDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkspace: (name: string) => void
}

// UpscaleDialog component props
export interface UpscaleDialogProps {
  isOpen: boolean
  onClose: () => void
  onUpscale: (upscaler: string, scaleFactor: number) => void
  sourceImage: { id: string; image: string; type: 'timeline' | 'canvas' } | null
  selectedUpscaler: string
  availableUpscalers: Array<{ name: string; model_name?: string; scale?: number }>
  loading?: boolean
  error?: string | null
}

// InpaintCanvas component props
export interface InpaintCanvasProps {
  currentImage?: string | null
  previewImage?: string | null
  livePreview?: string | null
  loading?: boolean
  progress?: Progress | null
  generationWidth?: number
  generationHeight?: number
  composerNodes: PromptNode[]
  onComposerNodesChange: (nodes: PromptNode[]) => void
  setInpaintMask: React.Dispatch<React.SetStateAction<string | null>>
  brushSize?: number
  drawingMode?: string
  inputImage?: string | null
  onImageUpload?: (image: string) => void
  inpaintFullRes: boolean
  inpaintFullResPadding: number
  setInpaintFullResPadding: (value: number) => void
  forceEditMode?: boolean
  maskBlur: number
  setMaskBlur: (value: number) => void
  inpaintingFill: number
  setInpaintingFill: (value: number) => void
  denoisingStrength: number
  setDenoisingStrength: (value: number) => void
  setInpaintFullRes: (value: boolean) => void
  inpaintingMaskInvert: boolean
  setInpaintingMaskInvert: (value: boolean) => void
  generationMode?: GenerationMode
  canvasRefreshKey?: number
  canvasControls: CanvasTopControlsProps
}

// CanvasArea component props
export interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLDivElement>
  panTargetRef: React.RefObject<HTMLDivElement>
  maskCanvasRef: React.RefObject<HTMLCanvasElement>
  overlayCanvasRef?: React.RefObject<HTMLCanvasElement>
  imageRef: React.RefObject<HTMLImageElement>
  displayImage?: string | null
  inputImage?: string | null
  previewImage?: string | null
  currentImage?: string | null
  livePreview?: string | null
  generationWidth?: number
  generationHeight?: number
  loading?: boolean
  progress?: Progress | null
  zoom: number
  panOffset: { x: number; y: number }
  fitToScreen: boolean
  isPanning: boolean
  isRightClickPanning: boolean
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  showMask: boolean
  showBorder: boolean
  inpaintFullRes: boolean
  inpaintFullResPadding: number
  setInpaintFullResPadding: (value: number) => void
  viewMode: 'edit' | 'result'
  isDrawing: boolean
  setLastDrawPos: (pos: { x: number; y: number } | null) => void
  brushSize: number
  setBrushSize: (size: number | ((prev: number) => number)) => void
  brushHardness?: number
  setBrushHardness?: (hardness: number) => void
  isDragOver: boolean
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: (e: React.MouseEvent) => void
  handleMouseEnter: (e: React.MouseEvent) => void
  drawingMode: string
  openFileDialog: () => void
  maskBlur: number
  setMaskBlur: (value: number) => void
  inpaintingFill: number
  setInpaintingFill: (value: number) => void
  denoisingStrength: number
  setDenoisingStrength: (value: number) => void
  setInpaintFullRes: (value: boolean) => void
  inpaintingMaskInvert: boolean
  setInpaintingMaskInvert: (value: boolean) => void
  uiVisible?: boolean
  setUiVisible?: (visible: boolean) => void
  scrollWheelZoomIncrement?: number
  generationMode?: GenerationMode
  focusBounds?: { x: number; y: number; width: number; height: number } | null
  maskBounds?: { x: number; y: number; width: number; height: number } | null
  canvasRefreshKey?: number
  handleZoomOut: () => void
  handleZoomIn: () => void
  handleResetZoom: () => void
  handleFitToScreen: () => void
}

// InpaintToolbar component props
export interface InpaintToolbarProps {
  drawingMode: string
  setDrawingMode: (mode: string) => void
  brushSize?: number
  setBrushSize?: (size: number) => void
  brushHardness?: number
  setBrushHardness?: (hardness: number) => void
  fillTarget: string
  setFillTarget: (target: string) => void
  fillTolerance: number
  setFillTolerance: (tolerance: number) => void
  fillOverfill: number
  setFillOverfill: (overfill: number) => void
  zoom?: number
  showMask: boolean
  setShowMask: (show: boolean) => void
  showBorder: boolean
  setShowBorder: (show: boolean) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo?: boolean
  canRedo?: boolean
}

// ZoomToolbar component props
export interface ZoomToolbarProps {
  zoom: number
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  fitToScreen: boolean
  handleZoomOut: () => void
  handleZoomIn: () => void
  handleResetZoom: () => void
  handleFitToScreen: () => void
  openFileDialog: () => void
  uiVisible: boolean
  setUiVisible: (visible: boolean) => void
}

// StatusBar component props
export interface StatusBarProps {
  displayImage?: string | null
  inputImage?: string | null
  zoom: number
  brushSize: number
  brushHardness: number
  drawingMode: string
  progress?: Progress | null
  loading?: boolean
}

// InpaintParametersPanel component props
export interface InpaintParametersPanelProps {
  maskBlur: number
  setMaskBlur: (value: number) => void
  inpaintingFill: number
  setInpaintingFill: (value: number) => void
  denoisingStrength: number
  setDenoisingStrength: (value: number) => void
  inpaintFullRes: boolean
  setInpaintFullRes: (value: boolean) => void
  inpaintingMaskInvert: boolean
  setInpaintingMaskInvert: (value: boolean) => void
  inpaintFullResPadding: number
  setInpaintFullResPadding: (value: number) => void
}
