// VITE UI
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OptionPickerProps } from '../types/components';

interface DropdownPosition {
  top: string;
  left: string;
}

const useDropdownPosition = (isOpen: boolean, triggerRef: React.RefObject<HTMLElement>): DropdownPosition => {
  const [position, setPosition] = useState<DropdownPosition>({ top: 'top-full', left: 'left-0' });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      // Defer setState to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setPosition({ top: 'top-full', left: 'left-0' });
      });
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate if dropdown fits below
      const fitsBelow = triggerRect.bottom + 200 <= viewportHeight; // 200px estimated dropdown height

      // Calculate if dropdown fits to the right
      const fitsRight = triggerRect.left + 120 <= viewportWidth; // 120px minimum width

      const newPosition: DropdownPosition = { top: 'top-full', left: 'left-0' };

      if (!fitsBelow) {
        // Show above if doesn't fit below
        newPosition.top = 'bottom-full';
      }

      if (!fitsRight && triggerRect.right >= 120) {
        // Show to the left if doesn't fit to the right
        newPosition.left = 'right-0';
      }

      setPosition(newPosition);
    };
    
    // Defer setState to avoid synchronous setState warning
    requestAnimationFrame(updatePosition);
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
}: OptionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPosition = useDropdownPosition(isOpen, triggerRef);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown opens/closes - derive from state
  const derivedFocusedIndex = useMemo(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex(option => option.value === value);
      return selectedIndex >= 0 ? selectedIndex : 0;
    }
    return -1;
  }, [isOpen, options, value]);

  // Sync derived value to state only when it changes
  useEffect(() => {
    setFocusedIndex(derivedFocusedIndex);
  }, [derivedFocusedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(options.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const container = containerRef.current;
    container?.addEventListener('keydown', handleKeyDown);
    return () => container?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, onChange]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;
  // Generate a stable ID for the dropdown
  const hookId = useId();
  const dropdownId = `option-picker-dropdown-${hookId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  // Measure the text width to set the container width
  const textWidth = displayText.length * 8; // Rough estimate: 8px per character
  const minWidth = 60; // Minimum width to prevent too narrow
  const containerWidth = Math.max(textWidth + 50, minWidth); // Add padding

  const handleTriggerClick = (): void => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string): void => {
    onChange(optionValue);
    setIsOpen(false);
  };

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
        tabIndex={-1}
        aria-hidden="true"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Custom styled display - single tabbable element */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? dropdownId : undefined}
        aria-label={title || placeholder}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleTriggerClick}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else if (e.key === 'Enter' || e.key === ' ') {
              if (focusedIndex >= 0 && focusedIndex < options.length) {
                onChange(options[focusedIndex].value);
                setIsOpen(false);
              }
            }
          }
        }}
        className={`
          relative flex items-center justify-between px-2 pb-3 text-sm bg-studio-surface border border-studio-border rounded
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-studio-surface/80'}
          focus:outline-none focus:ring-2 focus:ring-studio-accent focus:ring-offset-2 focus:ring-offset-studio-surface transition-all duration-200
        `}
        style={{ width: `${containerWidth}px` }}
      >
        <span className="text-studio-text truncate" aria-hidden="true">{displayText}</span>
        <ChevronDown
          size={12}
          className={`text-studio-textSecondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </div>

      {/* Title positioned absolutely over the selector */}
      {title && (
        <div className="relative h-0 w-[100%] bottom-[1.4em] text-[10px] text-right pr-1 pl-1 text-studio-textSecondary font-medium whitespace-nowrap pointer-events-none">
          {title}
        </div>
      )}

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          id={dropdownId}
          role="listbox"
          className={`absolute ${dropdownPosition.top} ${dropdownPosition.left} mt-1 bg-studio-panel border border-studio-border rounded shadow-lg z-50 max-h-48 overflow-y-auto`}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleOptionClick(option.value)}
              className={`
                px-3 py-2 text-sm cursor-pointer hover:bg-studio-surface whitespace-nowrap
                ${option.value === value ? 'bg-studio-accent/20 text-studio-accent' : 'text-studio-text'}
                ${index === focusedIndex ? 'bg-studio-accent/30' : ''}
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
