import React from 'react'
import { cn } from '../../../lib/utils.js'
import type { GroupNode, PromptNode } from '../types'
import NodeField from '../components/NodeField'

// Group Node Content
interface GroupNodeContentProps {
  node: GroupNode
  onUpdate: (updates: Partial<GroupNode>) => void
  showHint: (text: string) => void
  generateId: () => string
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  dragOverPosition: 'top' | 'bottom' | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
  setDragOverPosition: (position: 'top' | 'bottom' | null) => void
  handleDragStart: (e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, node?: PromptNode) => void
  handleDrop: (e: React.DragEvent, targetNode?: PromptNode, insertIndex?: number) => void
}

function GroupNodeContent({
  node,
  onUpdate,
  showHint,
  generateId,
  draggedNode,
  dragOverNode,
  dragOverPosition,
  setDraggedNode,
  setDragOverNode,
  setDragOverPosition,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop
}: GroupNodeContentProps) {
  const handleNodesChange = (newNodes: PromptNode[]) => {
    onUpdate({ value: newNodes })
  }

  return (
    <div className={cn("group", {
      'empty-group': node.value.length === 0,
      'drag-over': dragOverNode?.id === node.id
    })}>
      <NodeField
        nodes={node.value}
        onChange={handleNodesChange}
        draggedNode={draggedNode}
        dragOverNode={dragOverNode}
        dragOverPosition={dragOverPosition}
        setDraggedNode={setDraggedNode}
        setDragOverNode={setDragOverNode}
        setDragOverPosition={setDragOverPosition}
        showHint={showHint}
        generateId={generateId}
        parentNode={node}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
      />
    </div>
  )
}

export default GroupNodeContent