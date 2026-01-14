import React, { useRef } from 'react'
import { cn } from '../../../lib/utils.js'
import type { TagsNode, Tag } from '../types'
import TagComponent from '../components/TagComponent'

// Tags Node Content
interface TagsNodeContentProps {
  node: TagsNode
  onUpdate: (updates: Partial<TagsNode>) => void
  showHint: (text: string) => void
}

function TagsNodeContent({
  node,
  onUpdate,
  showHint
}: TagsNodeContentProps) {
  const tagRefs = useRef<(HTMLInputElement | null)[]>([])

  const addTag = (value = '', focusNew = false) => {
    const newTag: Tag = { value, weight: 1 }
    const newTags = [...node.value, newTag]
    onUpdate({ value: newTags })

    // Focus the new tag if requested
    if (focusNew) {
      setTimeout(() => {
        const newTagIndex = newTags.length - 1
        if (tagRefs.current[newTagIndex]) {
          tagRefs.current[newTagIndex]?.focus()
        }
      }, 0)
    }
  }

  const updateTag = (index: number, updates: Partial<Tag>) => {
    const newValue = [...node.value]
    newValue[index] = { ...newValue[index], ...updates }
    onUpdate({ value: newValue })
  }

  const removeTag = (index: number) => {
    if (node.value.length > 1) {
      onUpdate({ value: node.value.filter((_, i) => i !== index) })
    }
  }

  return (
    <div className="tags-node-container">
      <div className="tags-node">
        {node.value.map((tag, index) => (
          <TagComponent
            key={index}
            ref={(el) => tagRefs.current[index] = el}
            tag={tag}
            onUpdate={(updates) => updateTag(index, updates)}
            onRemove={() => removeTag(index)}
            onAddTag={(value, focusNew) => addTag(value, focusNew)}
            showHint={showHint}
          />
        ))}
        <button
          className="button add-tag-button"
          onClick={() => addTag('')}
          onMouseEnter={() => showHint("Add a new tag")}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default TagsNodeContent