import React, { useRef } from 'react'
import { cn } from '../../../lib/utils.js'
import type { TagsNode, Tag } from '../types'
import TagComponent from '../components/TagComponent'

// Tags Node Content
interface TagsNodeContentProps {
  node: TagsNode
  onUpdate: (updates: Partial<TagsNode>) => void
}

function TagsNodeContent({
  node,
  onUpdate,
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
      // Focus the previous tag if it exists before removing
      if (index > 0 && tagRefs.current[index - 1]) {
        tagRefs.current[index - 1]?.focus()
      }
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
          />
        ))}
        <button
          className="button add-tag-button"
          onClick={() => addTag('')}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default TagsNodeContent