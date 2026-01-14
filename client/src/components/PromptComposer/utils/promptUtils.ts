import type { PromptNode } from '../types'

// Helper function to compose prompts from nodes (returns { positive: string, negative: string })
export function composePromptsFromNodes(nodes: PromptNode[]): { positive: string, negative: string } {
  const positiveParts: string[] = []
  const negativeParts: string[] = []

  function processNode(node: PromptNode) {
    if (node.hidden) return

    switch (node.type) {
      case 'tags':
        const tagsNode = node as TagsNode
        const positiveTags: string[] = []
        const negativeTags: string[] = []

        tagsNode.value.forEach(tag => {
          if (tag.value.startsWith('<') && tag.value.endsWith('>')) {
            // LoRA tags always go to positive
            positiveTags.push(tag.value)
            return
          }

          const underscored = tag.value.replace(/ /g, '_')
          const formattedTag = tag.weight !== 1 ? `(${underscored}:${tag.weight})` : underscored

          if (tag.weight < 0) {
            // Negative weight tags go to negative prompt
            const positiveWeight = Math.abs(tag.weight) // Convert to positive weight for negative prompt
            const negativeFormattedTag = positiveWeight !== 1 ? `(${underscored}:${positiveWeight})` : underscored
            negativeTags.push(negativeFormattedTag)
          } else {
            // Positive or neutral weight tags go to positive prompt
            positiveTags.push(formattedTag)
          }
        })

        if (positiveTags.length > 0) {
          positiveParts.push(positiveTags.join(', ') + ', ')
        }
        if (negativeTags.length > 0) {
          negativeParts.push(negativeTags.join(', ') + ', ')
        }
        break

      case 'text':
        const textNode = node as TextNode
        const processedText = textNode.value
          .replace(/\n/g, ' ')
          .replace(/,+/g, ',')
          .replace(/  +/g, ' ')

        if (textNode.weight < 0) {
          // Negative weight text goes to negative prompt
          const positiveWeight = Math.abs(textNode.weight)
          const formattedText = positiveWeight !== 1 ? `(${processedText}:${positiveWeight})` : processedText
          negativeParts.push(formattedText)
        } else {
          // Positive or neutral weight text goes to positive prompt
          const formattedText = textNode.weight !== 1 ? `(${processedText}:${textNode.weight})` : processedText
          positiveParts.push(formattedText)
        }
        break

      case 'group':
        const groupResult = composePromptsFromNodes((node as GroupNode).value)
        if (groupResult.positive) positiveParts.push(groupResult.positive)
        if (groupResult.negative) negativeParts.push(groupResult.negative)
        break

      case 'break':
        const breakValue = `${(node as BreakNode).value.toUpperCase()}\n`
        positiveParts.push(breakValue)
        negativeParts.push(breakValue)
        break
    }
  }

  nodes.forEach(processNode)

  return {
    positive: positiveParts
      .join('')
      .replace(/, ,/g, ', ')
      .replace(/,+$/, '')
      .trim(),
    negative: negativeParts
      .join('')
      .replace(/, ,/g, ', ')
      .replace(/,+$/, '')
      .trim()
  }
}

// Utility function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}