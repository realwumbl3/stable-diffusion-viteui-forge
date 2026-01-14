import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../../lib/utils.js'
import type { Tag } from '../types'

// Individual Tag Component
interface TagComponentProps {
  tag: Tag
  onUpdate: (updates: Partial<Tag>) => void
  onRemove: () => void
  onAddTag: (value?: string, focusNew?: boolean) => void
  showHint: (text: string) => void
}

const TagComponent = React.forwardRef<HTMLInputElement, TagComponentProps>(({
  tag,
  onUpdate,
  onRemove,
  onAddTag,
  showHint
}, ref) => {
  const [inputValue, setInputValue] = useState(tag.value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Forward the ref to the input element
  React.useImperativeHandle(ref, () => inputRef.current!)

  useEffect(() => {
    setInputValue(tag.value)
  }, [tag.value])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    onUpdate({ value })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddTag('', true) // Pass true to focus the new tag
    } else if (e.key === 'Backspace' && inputValue === '') {
      onRemove()
    } else if (e.altKey && e.key === 'ArrowUp') {
      const newWeight = Math.min(1.7, Number((tag.weight + 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    } else if (e.altKey && e.key === 'ArrowDown') {
      const newWeight = Math.max(-1.7, Number((tag.weight - 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    }
  }

  const isLora = tag.value.startsWith('<') && tag.value.endsWith('>')
  const weightClass = tag.weight === 1 ? 'neutral' : tag.weight > 1 ? 'positive' : 'negative'

  return (
    <div
      className={cn('tag', weightClass, { lora: isLora })}
      style={{ '--weight': tag.weight } as React.CSSProperties}
    >
      <div className="weight-indicator">{tag.weight}</div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter tag..."
      />
      <button
        className="remove"
        onClick={onRemove}
        onMouseEnter={() => showHint("Remove this tag")}
      >
        X
      </button>
    </div>
  )
})

TagComponent.displayName = 'TagComponent'

export default TagComponent