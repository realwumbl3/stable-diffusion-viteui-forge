import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../../lib/utils";
import type { Tag } from "../types";

// Individual Tag Component
interface TagComponentProps {
    tag: Tag;
    onUpdate: (updates: Partial<Tag>) => void;
    onRemove: () => void;
    onAddTag: (value?: string, focusNew?: boolean) => void;
}

const TagComponent = React.forwardRef<HTMLInputElement, TagComponentProps>(
    ({ tag, onUpdate, onRemove, onAddTag }, ref) => {
        const [inputValue, setInputValue] = useState(tag.value);
        const inputRef = useRef<HTMLInputElement>(null);
        const measureRef = useRef<HTMLSpanElement>(null);

        // Forward the ref to the input element
        React.useImperativeHandle(ref, () => inputRef.current!);

        useEffect(() => {
            setInputValue(tag.value);
            // Adjust width when tag value changes from props
            setTimeout(() => adjustInputWidth(tag.value), 0);
        }, [tag.value]);

        const adjustInputWidth = (value: string) => {
            if (measureRef.current && inputRef.current) {
                // Measure the text width
                measureRef.current.textContent = value || "placeholder";
                const width = measureRef.current.offsetWidth + 4; // Add some padding
                const clampedWidth = Math.max(40, width); // Clamp between min and max
                inputRef.current.style.width = `${clampedWidth}px`;
            }
        };

        const handleInputChange = (value: string) => {
            setInputValue(value);
            onUpdate({ value });
            adjustInputWidth(value);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                onAddTag("", true); // Pass true to focus the new tag
            } else if (e.key === "Backspace" && inputValue === "") {
                onRemove();
                e.preventDefault(); // Prevent backspace from affecting the newly focused input
            } else if (e.altKey && e.key === "ArrowUp") {
                const newWeight = Math.min(1.7, Number((tag.weight + 0.05).toFixed(2)));
                onUpdate({ weight: newWeight });
                e.preventDefault();
            } else if (e.altKey && e.key === "ArrowDown") {
                const newWeight = Math.max(-1.7, Number((tag.weight - 0.05).toFixed(2)));
                onUpdate({ weight: newWeight });
                e.preventDefault();
            }
        };

        const isLora = tag.value.trim().startsWith("<") && tag.value.trim().endsWith(">");
        const weightClass = tag.weight === 1 ? "neutral" : tag.weight > 1 ? "positive" : "negative";

        return (
            <div
                className={cn("tag", weightClass, { lora: isLora })}
                style={{ "--weight": tag.weight } as React.CSSProperties}
            >
                <div className="weight-indicator">{tag.weight}</div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter tag..."
                    style={{ fontSize: "13px" }}
                />
                <button className="remove" onClick={onRemove}>
                    X
                </button>
                {/* Hidden element for measuring text width */}
                <span
                    ref={measureRef}
                    style={{
                        position: "absolute",
                        visibility: "hidden",
                        whiteSpace: "pre",
                        fontSize: "13px",
                        fontFamily: "inherit",
                    }}
                />
            </div>
        );
    }
);

TagComponent.displayName = "TagComponent";

export default TagComponent;
