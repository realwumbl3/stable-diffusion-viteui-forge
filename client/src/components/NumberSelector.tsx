// VITE UI
import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface NumberSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

const NumberSelector = ({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  className = "",
  inputClassName = "",
  disabled = false
}: NumberSelectorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle scroll wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -step : step;
      const newValue = Math.max(min, Math.min(max, value + delta));
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [value, min, max, step, onChange]);

  const increment = (): void => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const decrement = (): void => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = parseFloat(e.target.value);
    if (!isNaN(inputValue)) {
      const clampedValue = Math.max(min, Math.min(max, inputValue));
      onChange(clampedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    } else if (/^[0-9]$/.test(e.key)) {
      // Allow number input - focus the input element for typing
      e.preventDefault();
      inputRef.current?.focus();
      // If input is empty or has selection, replace it; otherwise append
      if (inputRef.current) {
        const input = inputRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value;
        const newValue = currentValue.slice(0, start) + e.key + currentValue.slice(end);
        input.value = newValue;
        input.setSelectionRange(start + 1, start + 1);
        handleInputChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      // Allow Enter/Space to work normally
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      role="spinbutton"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        "flex items-center outline-none transition-all duration-200",
        "focus:ring-2 focus:ring-studio-accent focus:ring-offset-2 focus:ring-offset-studio-surface rounded-lg",
        isFocused && "ring-2 ring-studio-accent ring-offset-2 ring-offset-studio-surface",
        className
      )}
    >
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          // Don't blur if focus is moving to container
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
          }
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "w-10 h-10 px-0 bg-studio-surface border-2 border-studio-border rounded-l-lg text-white text-base font-bold text-center appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          "focus:outline-none focus:ring-0 focus:border-studio-accent transition-all duration-200",
          "placeholder:text-studio-textMuted",
          inputClassName
        )}
      />

      {/* Custom Stepper Buttons */}
      <div className="flex flex-col h-10 w-6 bg-studio-surface border-2 border-l-0 border-studio-border rounded-r-lg overflow-hidden ml-0">
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          tabIndex={-1}
          className={cn(
            "flex-1 flex items-center justify-center transition-all duration-150",
            "hover:bg-studio-accent/20 active:bg-studio-accent/40",
            "disabled:opacity-20 disabled:cursor-not-allowed",
            "focus:outline-none"
          )}
          title="Increase"
        >
          <ChevronUp size={14} className="text-studio-textSecondary hover:text-studio-accent transition-colors" />
        </button>

        <div className="h-[1px] w-full bg-studio-border" />

        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          tabIndex={-1}
          className={cn(
            "flex-1 flex items-center justify-center transition-all duration-150",
            "hover:bg-studio-accent/20 active:bg-studio-accent/40",
            "disabled:opacity-20 disabled:cursor-not-allowed",
            "focus:outline-none"
          )}
          title="Decrease"
        >
          <ChevronDown size={14} className="text-studio-textSecondary hover:text-studio-accent transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default NumberSelector;
