import React from 'react'
import { cn } from '../../../lib/utils.js'
import type { GroupNode, PromptNode } from '../types'
import NodeField from '../components/NodeField'

// Group Node Content
interface GroupNodeContentProps {
  node: GroupNode
  onUpdate: (updates: Partial<GroupNode>) => void
  generateId: () => string
}

function GroupNodeContent({
  node,
  onUpdate,
  generateId
}: GroupNodeContentProps) {
  const handleNodesChange = (newNodes: PromptNode[]) => {
    onUpdate({ value: newNodes })
  }

  return (
    <div className={cn("group", {
      'empty-group': node.value.length === 0,
    })}>
      <NodeField
        nodes={node.value}
        onChange={handleNodesChange}
        generateId={generateId}
        parentNode={node}
      />
    </div>
  )
}

export default GroupNodeContent