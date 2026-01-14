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
  dragState: {
    dragTarget: PromptNode | null;
    lastDragged: PromptNode | null;
    sourceField: PromptNode[] | null;
  }
  generateId: () => string
  parentNode?: PromptNode
  handleDragStart?: (e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => void
  handleDragEnd?: () => void
  handleDragEnter?: (e: React.DragEvent, node: PromptNode) => void
  handleDrop?: (e: React.DragEvent) => void
}