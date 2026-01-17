import React, { useRef, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import type { TextNode } from '../types'

// Text Node Content
interface TextNodeContentProps {
  node: TextNode
  onUpdate: (updates: Partial<TextNode>) => void
}

function TextNodeContent({
  node,
  onUpdate
}: TextNodeContentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = () => {
    if (textareaRef.current) {
      onUpdate({ value: textareaRef.current.value })
      adjustHeight()
    }
  }

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = Math.max(textareaRef.current.scrollHeight, 58)
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [node.value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowUp') {
      const newWeight = Math.min(1.7, Number((node.weight + 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    } else if (e.altKey && e.key === 'ArrowDown') {
      const newWeight = Math.max(-1.7, Number((node.weight - 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    }
  }

  const weightClass = node.weight === 1 ? 'neutral' : node.weight > 1 ? 'positive' : 'negative'

  return (
    <div className={cn('text-node-container', weightClass)} style={{ '--weight': node.weight } as React.CSSProperties}>
      <div className="weight-indicator">{node.weight}</div>
      <textarea
        ref={textareaRef}
        className="basic-text"
        value={node.value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Enter your prompt text here..."
        style={{ height: '42px' }}
      />
    </div>
  )
}

export default TextNodeContent