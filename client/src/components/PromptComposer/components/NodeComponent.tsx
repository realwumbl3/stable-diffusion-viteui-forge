import React, { useState } from 'react'
import { cn } from '../../../lib/utils.js'
import type { PromptNode, NodeType } from '../types'
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
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  isDragged: boolean
  isDragOver: boolean
  dragOverPosition: 'top' | 'bottom' | null
  showHint: (text: string, duration?: number) => void
  generateId: () => string
  setDragOverPosition: (position: 'top' | 'bottom' | null) => void
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
}

function NodeComponent({
  node,
  index,
  onUpdate,
  onRemove,
  onAddNode,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragged,
  isDragOver,
  dragOverPosition,
  showHint,
  generateId,
  draggedNode,
  dragOverNode,
  setDraggedNode,
  setDragOverNode,
  setDragOverPosition
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
    showHint('Node JSON copied to clipboard')
  }

  const addNodeAfter = (type: NodeType) => {
    const insertIndex = cursorInTopHalf ? index : index + 1
    onAddNode(type, insertIndex)
  }

  const renderNodeContent = () => {
    switch (node.type) {
      case 'tags':
        return <TagsNodeContent node={node as TagsNode} onUpdate={onUpdate} showHint={showHint} />
      case 'text':
        return <TextNodeContent node={node as TextNode} onUpdate={onUpdate} />
      case 'group':
        return <GroupNodeContent
          node={node as GroupNode}
          onUpdate={onUpdate}
          showHint={showHint}
          generateId={generateId}
          draggedNode={isDragged ? draggedNode : null}
          dragOverNode={isDragOver ? dragOverNode : null}
          dragOverPosition={dragOverPosition}
          setDraggedNode={setDraggedNode}
          setDragOverNode={setDragOverNode}
          setDragOverPosition={setDragOverPosition}
          handleDragStart={onDragStart}
          handleDragEnd={onDragEnd}
          handleDragOver={onDragOver}
          handleDrop={onDrop}
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
        dragged: isDragged,
        'drag-over': isDragOver,
        'drag-over-top': isDragOver && dragOverPosition === 'top',
        'drag-over-bottom': isDragOver && dragOverPosition === 'bottom'
      })}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowFloatingButtons(true)}
      onMouseLeave={() => setShowFloatingButtons(false)}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="node-header">
        <div className="thumb" onMouseEnter={() => showHint("Drag to reorder this node")}>
          ::::::
        </div>

        <button
          className="button mute under-thumb"
          onClick={toggleMute}
          onMouseEnter={() => showHint("Mute/Unmute this node")}
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
              onMouseEnter={() => showHint("Add a tags node")}
            >
              tags
            </button>
            <button
              className="button"
              onClick={() => addNodeAfter('break')}
              onMouseEnter={() => showHint("Add a break node")}
            >
              break
            </button>
            <button
              className="button"
              onClick={() => addNodeAfter('text')}
              onMouseEnter={() => showHint("Add a text node")}
            >
              text
            </button>
            <button
              className="button"
              onClick={() => addNodeAfter('group')}
              onMouseEnter={() => showHint("Add a group node")}
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
                    showHint('Invalid JSON')
                  }
                }
              }}
              onMouseEnter={() => showHint("Insert JSON")}
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
          onMouseEnter={() => showHint("Remove this node")}
        >
          X
        </button>
        <button
          className="button json"
          onClick={copyJson}
          onMouseEnter={() => showHint("Copy JSON of this node")}
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