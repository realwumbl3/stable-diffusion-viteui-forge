import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  History,
  Star,
  Folder,
  Search,
  Grid3X3,
  List
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const Sidebar = ({ collapsed, onToggle, images, currentImage, onImageSelect }) => {
  const [activeTab, setActiveTab] = useState('images')
  const [viewMode, setViewMode] = useState('grid')

  const tabs = [
    { id: 'images', icon: ImageIcon, label: 'Images' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'favorites', icon: Star, label: 'Favorites' },
    { id: 'folders', icon: Folder, label: 'Folders' },
  ]

  return (
    <aside className={cn(
      "studio-sidebar relative overflow-hidden transition-all duration-300 ease-in-out",
      collapsed ? "w-12" : "w-90"
    )}>
      {/* Always-full-width Content Container */}
      <div className="w-80 h-full">
        {/* Collapsed Icon List */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center gap-4 py-6 px-2 transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                onToggle()
              }}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110",
                activeTab === tab.id
                  ? "bg-studio-accent text-studio-bg shadow-lg"
                  : "bg-studio-panel text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
              )}
              title={tab.label}
            >
              <tab.icon size={20} />
            </button>
          ))}
        </div>

        {/* Expanded Content */}
        <div className={cn(
          "h-full transition-opacity duration-300 ease-in-out",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          {/* Sidebar Header */}
          <div className="studio-sidebar-header">
            <div className="flex items-center justify-between">
              <h3 className="text-studio-text font-semibold text-sm">Library</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1 rounded text-studio-textSecondary hover:text-studio-text",
                    viewMode === 'grid' && "text-studio-accent bg-studio-accent/10"
                  )}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1 rounded text-studio-textSecondary hover:text-studio-text",
                    viewMode === 'list' && "text-studio-accent bg-studio-accent/10"
                  )}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors",
                    activeTab === tab.id
                      ? "bg-studio-accent/20 text-studio-accent"
                      : "text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                  )}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="studio-sidebar-content">
            {/* Search Bar */}
            <div className="p-4 border-b border-studio-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-studio-text-muted" />
                <input
                  type="text"
                  placeholder="Search images..."
                  className="studio-input pl-9 w-full"
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
              {activeTab === 'images' && (
                <div className={cn(
                  viewMode === 'grid'
                    ? "grid grid-cols-2 gap-2"
                    : "space-y-2"
                )}>
                  {images.map((imageSrc, index) => (
                    <button
                      key={index}
                      onClick={() => onImageSelect(imageSrc)}
                      className={cn(
                        "group relative rounded-lg overflow-hidden border-2 transition-all duration-200",
                        currentImage === imageSrc
                          ? "border-studio-accent shadow-studio-accent/50"
                          : "border-transparent hover:border-studio-border"
                      )}
                    >
                      <img
                        src={imageSrc}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {currentImage === imageSrc && (
                        <div className="absolute inset-0 bg-studio-accent/20 flex items-center justify-center">
                          <div className="w-2 h-2 bg-studio-accent rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}

                  {images.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-studio-text-muted">
                      <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No images yet</p>
                      <p className="text-xs">Generate your first image to get started</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="text-center py-8 text-studio-text-muted">
                  <History size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Generation history</p>
                  <p className="text-xs">Coming soon</p>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="text-center py-8 text-studio-text-muted">
                  <Star size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Favorite images</p>
                  <p className="text-xs">Star images to save them here</p>
                </div>
              )}

              {activeTab === 'folders' && (
                <div className="text-center py-8 text-studio-text-muted">
                  <Folder size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Project folders</p>
                  <p className="text-xs">Organize your work</p>
                </div>
              )}
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