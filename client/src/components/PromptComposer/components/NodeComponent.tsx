import React, { useState } from 'react'
import { cn } from '../../../lib/utils.js'
import type { PromptNode, NodeType, GroupNode, TextNode, TagsNode, BreakNode } from '../types'
import EyeIcon from '../icons/EyeIcon'
import TagsNodeContent from '../node-contents/TagsNodeContent'
import TextNodeContent from '../node-contents/TextNodeContent'
import GroupNodeContent from '../node-contents/GroupNodeContent'
import BreakNodeContent from '../node-contents/BreakNodeContent'

// Individual node components
interface NodeComponentProps {
  node: PromptNode
  index: number
  onUpdate: (updates: Partial<PromptNode>) => void
  onRemove: () => void
  onAddNode: (type: NodeType, index?: number) => void
  generateId: () => string
}

function NodeComponent({
  node,
  index,
  onUpdate,
  onRemove,
  onAddNode,
  generateId
}: NodeComponentProps) {
  const [showFloatingButtons, setShowFloatingButtons] = useState(false)
  const [cursorInTopHalf, setCursorInTopHalf] = useState(true)

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCursorInTopHalf(e.clientY < rect.top + rect.height / 2)
  }

  const toggleMute = () => {
    onUpdate({ hidden: !node.hidden })
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify([node], null, 2))
  }

  const addNodeAfter = (type: NodeType) => {
    const insertIndex = cursorInTopHalf ? index : index + 1
    onAddNode(type, insertIndex)
  }

  const renderNodeContent = () => {
    switch (node.type) {
      case 'tags':
        return <TagsNodeContent node={node as TagsNode} onUpdate={onUpdate} />
      case 'text':
        return <TextNodeContent node={node as TextNode} onUpdate={onUpdate} />
      case 'group':
        return <GroupNodeContent
          node={node as GroupNode}
          onUpdate={onUpdate}
          generateId={generateId}
        />
      case 'break':
        return <BreakNodeContent node={node as BreakNode} onUpdate={onUpdate} />
      default:
        return <div>Unknown node type</div>
    }
  }

  return (
    <div
      className={cn('node', {
        muted: node.hidden,
      })}
      data-node-id={node.id}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowFloatingButtons(true)}
      onMouseLeave={() => setShowFloatingButtons(false)}
    >
      <div className="node-header">
        <div
          className="thumb"
          draggable
        >
          ::::::
        </div>

        <button
          className="button mute under-thumb"
          onClick={toggleMute}
        >
          <EyeIcon />
          <span className="mutelabel">{node.hidden ? 'muted' : ''}</span>
        </button>
      </div>

      {showFloatingButtons && (
        <div className={cn('floating-buttons', { bottom: !cursorInTopHalf })}>
          <div>
            <label>add</label>
            <button
              className="button"
              onClick={() => addNodeAfter('tags')}
            >
              tags
            </button>
            <button
              className="button"  
              onClick={() => addNodeAfter('break')}
            >
              break
            </button>
            <button
              className="button"
              onClick={() => addNodeAfter('text')}
            >
              text
            </button>
            <button
              className="button"
              onClick={() => addNodeAfter('group')}
            >
              group
            </button>
            <button
              className="button json"
              onClick={() => {
                const json = prompt('Insert JSON:')
                if (json) {
                  try {
                    const parsed = JSON.parse(json)
                    if (Array.isArray(parsed)) {
                      // Handle multiple nodes
                      const baseInsertIndex = cursorInTopHalf ? index : index + 1
                      parsed.forEach((newNode, offset) => {
                        onAddNode(newNode.type, baseInsertIndex + offset)
                      })
                    }
                  } catch (e) {
                    console.error('Invalid JSON', e)
                  }
                }
              }}
            >
              json
            </button>
          </div>
        </div>
      )}

      <div className="controls">
        <button
          className="button"
          onClick={onRemove}
        >
          X
        </button>
        <button
          className="button json"
          onClick={copyJson}
        >
          {'{ js }'}
        </button>
      </div>

      <div className="node-area" style={node.type === 'group' ? { padding: '12px 3px' } : { padding: '0' }}>
        {renderNodeContent()}
      </div>
    </div>
  )
}

export default NodeComponent