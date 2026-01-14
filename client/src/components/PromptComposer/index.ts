// Main component export
export { default } from './PromptComposer'

// Type exports
export type {
  NodeType,
  BaseNode,
  TagsNode,
  Tag,
  TextNode,
  GroupNode,
  BreakNode,
  PromptNode,
  PromptComposerProps,
  NodeFieldProps
} from './types'

// Utility exports
export { composePromptsFromNodes, generateId } from './utils/promptUtils'