// VITE UI

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Image as ImageIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import ResolutionPicker from './ResolutionPicker.jsx'

const ResolutionIndicator = ({
  width,
  setWidth,
  height,
  setHeight,
  inputImage
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const indicatorRef = useRef(null)
  const popupRef = useRef(null)

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (indicatorRef.current && !indicatorRef.current.contains(event.target) &&
          popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={indicatorRef}>
      {/* Resolution Indicator Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 text-sm rounded transition-all duration-200",
          "bg-studio-surface border border-studio-border hover:bg-studio-panelHover",
          "text-studio-text hover:text-studio-text",
          isOpen && "bg-studio-accent/10 border-studio-accent text-studio-accent"
        )}
        title="Click to change resolution"
      >
        <ImageIcon size={14} />
        <span className="font-medium">{width}×{height}</span>
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Resolution Picker Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50"
        >
          <div className="bg-studio-panel rounded-lg shadow-xl p-4 min-w-[280px]">
            <ResolutionPicker
              width={width}
              setWidth={setWidth}
              height={height}
              setHeight={setHeight}
              inputImage={inputImage}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ResolutionIndicator