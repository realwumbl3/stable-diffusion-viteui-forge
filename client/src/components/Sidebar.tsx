import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Maximize2,
  Type,
  Edit,
  RefreshCw
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn, resolveImageSrc } from '../lib/utils'
import TimelineItem from './TimelineItem'
import GenerationsNavigator from './GenerationsNavigator'
import KeyIndicator from './KeyIndicator'
import type { Generation } from '../Api'
import type { SidebarProps } from '../types/components'

const Sidebar = ({
  collapsed,
  onToggle,
  timeline,
  currentImage,
  onPreviewSelect,
  onCommitPreview,
  onRejectPreview,
  onDiscardGeneration,
  onRestoreGeneration,
  onUncommitGeneration,
  onGenerationModeChange,
  generationMode,
  onUpscale,
  getGenerationImageUrl,
  onRefreshTimeline,
  onRefreshCanvas,
  canvasRefreshKey
}: SidebarProps) => {
  const [committedPage, setCommittedPage] = useState<number>(0)
  const [discardedPage, setDiscardedPage] = useState<number>(0)
  const [imageLoadTick, setImageLoadTick] = useState(0)
  const canvasImgRef = useRef<HTMLImageElement>(null)

  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  // Update canvas dimensions when image loads or changes
  useEffect(() => {
    const img = canvasImgRef.current

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    } else {
      setCanvasDimensions({ width: 0, height: 0 })
    }
  }, [currentImage, canvasRefreshKey, imageLoadTick])

  const handleCanvasImageLoad = () => {
    setImageLoadTick((tick) => tick + 1)
  }

  const previewImage = getGenerationImageUrl?.(timeline.currentPreview) ?? null
  const hasQueueItems = timeline.generationQueue.length > 0
  const hasCommitted = timeline.committedHistory.length > 0
  const hasDiscarded = timeline.discarded.length > 0

  const itemsPerPage = 5

  // Show latest items first with pagination
  const committedPages = Math.ceil(timeline.committedHistory.length / itemsPerPage)
  const discardedPages = Math.ceil(timeline.discarded.length / itemsPerPage)

  const displayedCommitted = timeline.committedHistory.slice(
    committedPage * itemsPerPage,
    (committedPage + 1) * itemsPerPage
  )

  const displayedDiscarded = timeline.discarded.slice(
    discardedPage * itemsPerPage,
    (discardedPage + 1) * itemsPerPage
  )

  const handleTimelineUpscale = (generation: Generation): void => {
    if (!onUpscale) return
    const image = getGenerationImageUrl?.(generation)
    if (!image) return
    onUpscale({ id: generation.genid, image, type: 'timeline' })
  }

  return (
    <aside className={cn(
      "studio-sidebar relative overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
      collapsed ? "w-12" : "w-min"
    )}>
      {/* Always-full-width Content Container */}
      <div className="w-min h-full">
        {/* Collapsed Icon List */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center gap-4 py-6 px-2 transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <button
            onClick={onToggle}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 bg-studio-panel text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
            title="Timeline"
            type="button"
          >
            <ImageIcon size={20} />
          </button>
        </div>

        {/* Expanded Content */}
        <div className={cn(
          "h-full flex flex-col transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          {/* Sidebar Header */}
          <div className="studio-sidebar-header flex-shrink-0 p-4">
            {/* Generation Mode Buttons */}
            <div className="flex items-center bg-studio-surface rounded-lg p-1 border border-studio-border mb-4 gap-1">
              <button
                onClick={() => {
                  if (generationMode === 'txt2img') {
                    onToggle();
                  } else {
                    onGenerationModeChange('txt2img');
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 simple-block-fill",
                  generationMode === 'txt2img'
                    ? "bg-studio-accent text-studio-bg shadow-sm"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title="Text to Image (Alt+T)"
                type="button"
              >
                <Type size={16} />
                <span className="hidden sm:inline">Text</span>
                <KeyIndicator keys="Alt+T" />
              </button>
              <button
                onClick={() => {
                  if (generationMode === 'img2img') {
                    onToggle();
                  } else {
                    onGenerationModeChange('img2img');
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 simple-block-fill",
                  generationMode === 'img2img'
                    ? "bg-studio-accent text-studio-bg shadow-sm"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title="Image to Image (Alt+I)"
                type="button"
              >
                <ImageIcon size={16} />
                <span className="hidden sm:inline">Image</span>
                <KeyIndicator keys="Alt+I" />
              </button>

              <button
                onClick={() => {
                  if (generationMode === 'inpaint') {
                    onToggle();
                  } else {
                    onGenerationModeChange('inpaint');
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 simple-block-fill",
                  generationMode === 'inpaint'
                    ? "bg-studio-accent text-studio-bg shadow-sm"
                    : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                )}
                title="Inpaint (Alt+N)"
                type="button"
              >
                <Edit size={16} />
                <span className="hidden sm:inline">Inpaint</span>
                <KeyIndicator keys="Alt+N" />
              </button>
            </div>
            <GenerationsNavigator
              generationQueue={timeline.generationQueue}
              currentPreview={timeline.currentPreview}
              latestCommit={timeline.committedHistory[0] ?? null}
              onPreviewSelect={onPreviewSelect}
              onCommit={onCommitPreview}
              onReject={onRejectPreview}
            />
          </div>

          {/* Sidebar Content */}
          <div className="studio-sidebar-content flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Generations</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshTimeline?.();
                      }}
                      className="p-1 hover:bg-studio-surface rounded text-studio-textSecondary hover:text-studio-text transition-all duration-200"
                      title="Refresh Timeline"
                      type="button"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                  {hasQueueItems && <span>{timeline.generationQueue.length}</span>}
                </div>
                {hasQueueItems ? (
                  <div className="grid grid-cols-1 gap-2">
                    {timeline.generationQueue.map(generation => (
                      <TimelineItem
                        key={generation.genid}
                        item={generation}
                        isActive={timeline.currentPreview?.genid === generation.genid}
                        onSelect={() => onPreviewSelect(generation)}
                        onDiscard={() => onDiscardGeneration(generation)}
                        showDiscard
                        onCommit={onCommitPreview}
                        onReject={onRejectPreview}
                        showCommitReject
                        getGenerationImageUrl={getGenerationImageUrl}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-studio-text-muted">No generations yet</div>
                )}
              </div>


              {/* Canvas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <span>Canvas</span>
                </div>
                <div className="studio-panel p-2 rounded-lg space-y-2">
                  <div className="relative rounded-md overflow-hidden border border-studio-border cursor-pointer simple-block-fill group"
                    onClick={() => {
                      // Clear any selected preview to navigate to canvas
                      if (timeline.currentPreview) {
                        onPreviewSelect(null)
                      }
                    }}>
                    {currentImage ? (
                      <img
                        ref={canvasImgRef}
                        src={`${resolveImageSrc(currentImage, "full") || ''}${canvasRefreshKey > 0 ? `?refresh=${canvasRefreshKey}` : ''}`}
                        crossOrigin="anonymous"
                        alt="Canvas"
                        className="w-full object-contain"
                        onLoad={handleCanvasImageLoad}
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-xs text-studio-text-muted">
                        Canvas is empty
                      </div>
                    )}
                    {previewImage && (
                      <div className="absolute inset-0 bg-studio-accent/10 border border-studio-accent/40" />
                    )}

                    {/* Refresh Button - Bottom Right */}
                    {currentImage && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          onRefreshCanvas?.()
                        }}
                        className="absolute bottom-2 right-2 rounded bg-studio-panel/90 text-studio-textSecondary p-1.5 hover:bg-studio-surface 
                        hover:text-studio-text transition-all duration-200 shadow-sm opacity-0
                        group-hover:opacity-100 transition-opacity"
                        title="Refresh Canvas"
                        type="button"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}

                    {/* Canvas Header Container */}
                    {currentImage && (
                      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-studio-panel/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                          {/* Left side - Resolution */}
                          <div className="flex items-center">
                            {canvasDimensions.width > 0 && (
                              <div className="rounded bg-studio-panel/80 text-studio-textSecondary px-1.5 py-0.5 text-xs">
                                {canvasDimensions.width}×{canvasDimensions.height}
                              </div>
                            )}
                          </div>

                          {/* Right side - Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                onUpscale?.({
                                  id: 'canvas-current',
                                  image: currentImage,
                                  type: 'canvas'
                                })
                              }}
                              className="rounded bg-studio-panel/80 text-studio-textSecondary p-1 hover:bg-studio-surface transition-colors"
                              title="Upscale Canvas"
                              type="button"
                            >
                              <Maximize2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Committed Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Committed</span>
                    {committedPages > 1 && (
                      <>
                        <button
                          onClick={() => setCommittedPage(Math.max(0, committedPage - 1))}
                          disabled={committedPage === 0}
                          className="p-0.5 hover:bg-studio-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous page"
                          type="button"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span className="text-xs">
                          {committedPage + 1}/{committedPages}
                        </span>
                        <button
                          onClick={() => setCommittedPage(Math.min(committedPages - 1, committedPage + 1))}
                          disabled={committedPage >= committedPages - 1}
                          className="p-0.5 hover:bg-studio-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next page"
                          type="button"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </>
                    )}
                  </div>
                  {hasCommitted && <span>{timeline.committedHistory.length}</span>}
                </div>
                {hasCommitted ? (
                  <div className="grid grid-cols-1 gap-2">
                    {displayedCommitted.map(generation => (
                      <TimelineItem
                        key={generation.genid}
                        item={generation}
                        isActive={timeline.currentPreview?.genid === generation.genid}
                        onSelect={() => onPreviewSelect(generation)}
                        onUpscale={handleTimelineUpscale}
                        showUpscale
                        onCommit={() => onUncommitGeneration(generation)}
                        showCommitReject={true}
                        commitLabel="Uncommit"
                        getGenerationImageUrl={getGenerationImageUrl}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-studio-text-muted">No committed images</div>
                )}
              </div>

              {/* Discarded */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Discarded</span>
                    {discardedPages > 1 && (
                      <>
                        <button
                          onClick={() => setDiscardedPage(Math.max(0, discardedPage - 1))}
                          disabled={discardedPage === 0}
                          className="p-0.5 hover:bg-studio-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous page"
                          type="button"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span className="text-xs">
                          {discardedPage + 1}/{discardedPages}
                        </span>
                        <button
                          onClick={() => setDiscardedPage(Math.min(discardedPages - 1, discardedPage + 1))}
                          disabled={discardedPage >= discardedPages - 1}
                          className="p-0.5 hover:bg-studio-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next page"
                          type="button"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </>
                    )}
                  </div>
                  {hasDiscarded && <span>{timeline.discarded.length}</span>}
                </div>
                {hasDiscarded ? (
                  <div className="grid grid-cols-1 gap-2">
                    {displayedDiscarded.map(generation => (
                      <TimelineItem
                        key={generation.genid}
                        item={generation}
                        isActive={false}
                        onSelect={() => onRestoreGeneration(generation)}
                        onDiscard={() => onDiscardGeneration(generation)}
                        showDiscard
                        getGenerationImageUrl={getGenerationImageUrl}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-studio-text-muted">Nothing discarded</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </aside>
  )
}

export { Sidebar as default }
