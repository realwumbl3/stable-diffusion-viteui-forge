import {
  ChevronLeft,
  Image as ImageIcon,
  Trash2
} from 'lucide-react'
import { cn } from '../lib/utils.js'
import TimelineItem from './TimelineItem.jsx'

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
  onGenerationModeChange
}) => {
  const previewImage = timeline.currentPreview?.image
  const hasQueueItems = timeline.generationQueue.length > 0
  const hasCommitted = timeline.committedHistory.length > 0
  const hasDiscarded = timeline.discarded.length > 0

  return (
    <aside className={cn(
      "studio-sidebar relative overflow-hidden transition-all duration-300 ease-in-out",
      collapsed ? "w-12" : "w-90"
    )}>
      {/* Always-full-width Content Container */}
      <div className="w-90 h-full">
        {/* Collapsed Icon List */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center gap-4 py-6 px-2 transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <button
            onClick={onToggle}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 bg-studio-panel text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
            title="Timeline"
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
          <div className="studio-sidebar-header flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-studio-text font-semibold text-sm">Timeline</h3>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="studio-sidebar-content flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Generation Queue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <span>Generations</span>
                  {hasQueueItems && <span>{timeline.generationQueue.length}</span>}
                </div>
                {hasQueueItems ? (
                  <div className="space-y-2">
                    {timeline.generationQueue.map(item => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isActive={timeline.currentPreview?.id === item.id}
                        onSelect={() => onPreviewSelect(item)}
                        onDiscard={() => onDiscardGeneration(item)}
                        showDiscard
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-studio-text-muted">No generations yet</div>
                )}
              </div>

              {/* Commit/Reject Actions */}
              {previewImage && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={onCommitPreview}
                      className="studio-btn flex-1"
                    >
                      Commit
                    </button>
                    <button
                      onClick={onRejectPreview}
                      className="studio-btn-ghost flex-1 text-studio-textSecondary hover:text-studio-text"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Canvas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <span>Canvas</span>
                </div>
                <div className="studio-panel p-2 rounded-lg space-y-2">
                  <div className="relative rounded-md overflow-hidden border border-studio-border cursor-pointer"
                       onClick={() => {
                         // Switch to inpainting mode when clicking canvas in sidebar
                         if (onGenerationModeChange) {
                           onGenerationModeChange('inpaint')
                         }
                         // Clear any selected preview
                         if (timeline.currentPreview) {
                           onPreviewSelect(null)
                         }
                       }}>
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt="Canvas"
                        className="w-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-xs text-studio-text-muted">
                        Canvas is empty
                      </div>
                    )}
                    {previewImage && (
                      <div className="absolute inset-0 bg-studio-accent/10 border border-studio-accent/40" />
                    )}
                  </div>
                </div>
              </div>

              {/* Committed Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-studio-textSecondary uppercase tracking-wider">
                  <span>Committed</span>
                  {hasCommitted && <span>{timeline.committedHistory.length}</span>}
                </div>
                {hasCommitted ? (
                  <div className="grid grid-cols-1 gap-2">
                    {timeline.committedHistory.map(item => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isActive={timeline.currentPreview?.id === item.id}
                        onSelect={() => onPreviewSelect(item)}
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
                  <span>Discarded</span>
                  {hasDiscarded && <span>{timeline.discarded.length}</span>}
                </div>
                {hasDiscarded ? (
                  <div className="grid grid-cols-1 gap-2">
                    {timeline.discarded.map(item => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isActive={false}
                        onSelect={() => onRestoreGeneration(item)}
                        badge={<Trash2 size={12} />}
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

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -left-4 w-8 h-8 bg-studio-panel border border-studio-border rounded-full flex items-center justify-end hover:bg-studio-panelHover transition-all duration-200 shadow-studio"
      >
        <ChevronLeft size={16} className="transition-transform duration-200" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
    </aside>
  )
}

export default Sidebar