import React from 'react'
import type { PromptNode, NodeType } from '../types'
import NodeComponent from './NodeComponent'

// NodeField component for managing a collection of nodes
interface NodeFieldProps {
  nodes: PromptNode[]
  onChange: (nodes: PromptNode[]) => void
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  dragOverPosition: 'top' | 'bottom' | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
  setDragOverPosition: (position: 'top' | 'bottom' | null) => void
  showHint: (text: string, duration?: number) => void
  generateId: () => string
  parentNode?: PromptNode
  handleDragStart?: (e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => void
  handleDragEnd?: () => void
  handleDragOver?: (e: React.DragEvent, node?: PromptNode) => void
  handleDrop?: (e: React.DragEvent, targetNode?: PromptNode, insertIndex?: number) => void
}

function NodeField({
  nodes,
  onChange,
  draggedNode,
  dragOverNode,
  dragOverPosition,
  setDraggedNode,
  setDragOverNode,
  setDragOverPosition,
  showHint,
  generateId,
  parentNode,
  handleDragStart: customHandleDragStart,
  handleDragEnd: customHandleDragEnd,
  handleDragOver: customHandleDragOver,
  handleDrop: customHandleDrop
}: NodeFieldProps) {
  const addNode = (type: NodeType, index?: number) => {
    const baseNode = {
      id: generateId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      hidden: false,
      weight: 1
    }

    let newNode: PromptNode
    switch (type) {
      case 'tags':
        newNode = { ...baseNode, type: 'tags', value: [{ value: '', weight: 1 }] } as TagsNode
        break
      case 'text':
        newNode = { ...baseNode, type: 'text', value: '' } as TextNode
        break
      case 'group':
        newNode = { ...baseNode, type: 'group', value: [] } as GroupNode
        break
      case 'break':
        newNode = { ...baseNode, type: 'break', value: 'break' } as BreakNode
        break
    }

    const newNodes = [...nodes]
    const insertIndex = index !== undefined ? index : newNodes.length
    newNodes.splice(insertIndex, 0, newNode)
    onChange(newNodes)
  }

  const removeNode = (nodeId: string) => {
    onChange(nodes.filter(node => node.id !== nodeId))
  }

  const updateNode = (nodeId: string, updates: Partial<PromptNode>) => {
    onChange(nodes.map(node =>
      node.id === nodeId ? ({ ...node, ...updates } as PromptNode) : node
    ))
  }


  // Use custom handlers if provided, otherwise use defaults
  const actualHandleDragStart = customHandleDragStart || ((e: React.DragEvent, node: PromptNode) => {
    // Default drag start behavior for nested NodeFields
    console.log('Default drag start - this should not be called in main NodeField')
  })

  const actualHandleDragEnd = customHandleDragEnd || (() => {
    // Default drag end behavior for nested NodeFields
    console.log('Default drag end - this should not be called in main NodeField')
  })

  const actualHandleDragOver = customHandleDragOver || ((e: React.DragEvent, node?: PromptNode) => {
    e.preventDefault()
    // Default drag over behavior for nested NodeFields
    setDragOverPosition(null) // Reset position for nested fields
  })

  const actualHandleDrop = customHandleDrop || ((e: React.DragEvent, targetNode?: PromptNode, insertIndex?: number) => {
    e.preventDefault()
    // Default drop behavior for nested NodeFields
  })

  return (
    <div
      className="node-field"
      onDragOver={(e) => actualHandleDragOver(e)}
      onDrop={(e) => actualHandleDrop(e)}
    >
      {nodes.length === 0 && (
        <div className="empty-field">
          <button
            className="button"
            onClick={() => addNode('tags')}
            onMouseEnter={() => showHint("Add your first node")}
          >
            + Add Node
          </button>
        </div>
      )}
      {nodes.map((node, index) => (
        <React.Fragment key={node.id}>
          {/* Drop zone before each node (except the first) */}
          {index > 0 && (
            <div
              className="drop-zone between-nodes"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (draggedNode) {
                  e.currentTarget.classList.add('active')
                  setDragOverPosition('top') // Insert before this node
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('active')
                setDragOverPosition(null)
              }}
              onDrop={(e) => {
                e.stopPropagation()
                e.currentTarget.classList.remove('active')
                actualHandleDrop(e, undefined, index)
              }}
            />
          )}
          <NodeComponent
            node={node}
            index={index}
            onUpdate={(updates) => updateNode(node.id, updates)}
            onRemove={() => removeNode(node.id)}
            onAddNode={(type, insertIndex) => addNode(type, insertIndex)}
            onDragStart={(e) => actualHandleDragStart(e, node, nodes)}
            onDragEnd={actualHandleDragEnd}
            onDragOver={(e) => {
              e.stopPropagation()
              actualHandleDragOver(e, node)
            }}
            onDrop={(e) => {
              e.stopPropagation()
              actualHandleDrop(e, node)
            }}
            isDragged={draggedNode?.id === node.id}
            isDragOver={dragOverNode?.id === node.id}
            dragOverPosition={dragOverPosition}
            showHint={showHint}
            generateId={generateId}
            draggedNode={draggedNode}
            dragOverNode={dragOverNode}
            setDraggedNode={setDraggedNode}
            setDragOverNode={setDragOverNode}
            setDragOverPosition={setDragOverPosition}
          />
        </React.Fragment>
      ))}
      {/* Drop zone at the end */}
      {nodes.length > 0 && (
        <div
          className="drop-zone end-zone"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (draggedNode) {
              e.currentTarget.classList.add('active')
              setDragOverPosition('bottom') // Insert at the end
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('active')
            setDragOverPosition(null)
          }}
          onDrop={(e) => {
            e.stopPropagation()
            e.currentTarget.classList.remove('active')
            actualHandleDrop(e, undefined, nodes.length)
          }}
        />
      )}
    </div>
  )
}

export default NodeField