import React, { useRef } from 'react'
import type { PromptNode, NodeType, TagsNode, TextNode, GroupNode, BreakNode } from '../types'
import NodeComponent from './NodeComponent'

// NodeField component for managing a collection of nodes
interface NodeFieldProps {
  nodes: PromptNode[]
  onChange: (nodes: PromptNode[]) => void
  generateId: () => string
  parentNode?: PromptNode
}

function NodeField({
  nodes,
  onChange,
  generateId
}: NodeFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
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


  return (
    <div className="node-field" ref={fieldRef}>
      {nodes.length === 0 && (
        <div className="empty-field">
          <button
            className="button"
            onClick={() => addNode('tags')}
          >
            + Add Node
          </button>
        </div>
      )}
      {nodes.map((node, index) => (
        <NodeComponent
          key={node.id}
          node={node}
          index={index}
          onUpdate={(updates) => updateNode(node.id, updates)}
          onRemove={() => removeNode(node.id)}
          onAddNode={(type, insertIndex) => addNode(type, insertIndex)}
          generateId={generateId}
        />
      ))}
    </div>
  )
}

export default NodeField