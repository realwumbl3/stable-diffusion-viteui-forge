// Node types
export type NodeType = 'tags' | 'text' | 'group' | 'break'

export interface BaseNode {
  id: string
  type: NodeType
  name: string
  hidden: boolean
  weight: number
}

export interface TagsNode extends BaseNode {
  type: 'tags'
  value: Tag[]
}

export interface Tag {
  value: string
  weight: number
}

export interface TextNode extends BaseNode {
  type: 'text'
  value: string
}

export interface GroupNode extends BaseNode {
  type: 'group'
  value: PromptNode[]
}

export interface BreakNode extends BaseNode {
  type: 'break'
  value: 'break' | 'addcomm' | 'addrow' | 'addcol'
}

export type PromptNode = TagsNode | TextNode | GroupNode | BreakNode

export interface PromptComposerProps {
  className?: string
  onPromptChange?: (prompt: string) => void
  onNegativePromptChange?: (negativePrompt: string) => void
  onNodesChange?: (nodes: PromptNode[]) => void
  initialData?: PromptNode[]
  showDemoButton?: boolean
  showKeyboardHints?: boolean
}

export interface NodeFieldProps {
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