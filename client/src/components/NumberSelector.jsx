import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const NumberSelector = ({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  className = "",
  inputClassName = "",
  disabled = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Handle scroll wheel
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -step : step;
      const newValue = Math.max(min, Math.min(max, value + delta));
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    input.addEventListener('wheel', handleWheel, { passive: false });
    return () => input.removeEventListener('wheel', handleWheel);
  }, [value, min, max, step, onChange, isFocused]);

  const increment = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleInputChange = (e) => {
    const inputValue = parseFloat(e.target.value);
    if (!isNaN(inputValue)) {
      const clampedValue = Math.max(min, Math.min(max, inputValue));
      onChange(clampedValue);
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          "w-10 h-10 px-0 bg-studio-surface border-2 border-studio-border rounded-l-lg text-white text-base font-bold text-center appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          "focus:outline-none focus:ring-2 focus:ring-studio-accent focus:border-studio-accent transition-all duration-200",
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