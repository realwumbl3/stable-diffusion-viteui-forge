// VITE UI
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const useDropdownPosition = (isOpen, triggerRef) => {
  const [position, setPosition] = useState({ top: 'top-full', left: 'left-0' });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate if dropdown fits below
    const fitsBelow = triggerRect.bottom + 200 <= viewportHeight; // 200px estimated dropdown height

    // Calculate if dropdown fits to the right
    const fitsRight = triggerRect.left + 120 <= viewportWidth; // 120px minimum width

    let newPosition = { top: 'top-full', left: 'left-0' };

    if (!fitsBelow) {
      // Show above if doesn't fit below
      newPosition.top = 'bottom-full';
    }

    if (!fitsRight && triggerRect.right >= 120) {
      // Show to the left if doesn't fit to the right
      newPosition.left = 'right-0';
    }

    setPosition(newPosition);
  }, [isOpen, triggerRef]);

  return position;
};

const OptionPicker = ({
  options,
  value,
  onChange,
  title,
  placeholder = "Select...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownPosition = useDropdownPosition(isOpen, triggerRef);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Measure the text width to set the container width
  const textWidth = displayText.length * 8; // Rough estimate: 8px per character
  const minWidth = 60; // Minimum width to prevent too narrow
  const containerWidth = Math.max(textWidth + 50, minWidth); // Add padding

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden select for form compatibility */}
      <select
        ref={selectRef}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 w-full h-full cursor-pointer"
        style={{ width: `${containerWidth}px` }}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Custom styled display */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          relative flex items-center justify-between px-2 pb-3 text-sm bg-studio-surface border border-studio-border rounded
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-studio-surface/80'}
          focus-within:ring-1 focus-within:ring-studio-accent focus-within:outline-none
        `}
        style={{ width: `${containerWidth}px` }}
      >
        <span className="text-studio-text truncate">{displayText}</span>
        <ChevronDown
          size={12}
          className={`text-studio-textSecondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Title positioned absolutely over the selector */}
      {title && (
        <div className="absolute bottom-0 right-1 text-[10px] text-studio-textSecondary font-medium whitespace-nowrap pointer-events-none">
          {title}
        </div>
      )}

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className={`absolute ${dropdownPosition.top} ${dropdownPosition.left} mt-1 bg-studio-panel border border-studio-border rounded shadow-lg z-50 max-h-48 overflow-y-auto min-w-[120px]`}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                px-3 py-2 text-sm cursor-pointer hover:bg-studio-surface whitespace-nowrap
                ${option.value === value ? 'bg-studio-accent/20 text-studio-accent' : 'text-studio-text'}
              `}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptionPicker;