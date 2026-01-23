import type { PromptNode, GroupNode, TagsNode, TextNode, BreakNode } from '../types'

// Helper function to compose prompts from nodes (returns { positive: string, negative: string })
export function composePromptsFromNodes(nodes: PromptNode[]): { positive: string, negative: string } {
  const positiveParts: string[] = []
  const negativeParts: string[] = []

  function processNode(node: PromptNode) {
    if (node.hidden) return

    switch (node.type) {
      case 'tags': {
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
      }

      case 'text': {
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
      }

      case 'group': {
        const groupResult = composePromptsFromNodes((node as GroupNode).value)
        if (groupResult.positive) positiveParts.push(groupResult.positive)
        if (groupResult.negative) negativeParts.push(groupResult.negative)
        break
      }

      case 'break': {
        const breakValue = `${(node as BreakNode).value.toUpperCase()}\n`
        positiveParts.push(breakValue)
        negativeParts.push(breakValue)
        break
      }
    }
  }

  nodes.forEach(processNode)

  const positive = positiveParts
    .join('')
    .replace(/, ,/g, ', ')
    .replace(/,+$/, '')
    .trim()

  const negative = negativeParts
    .join('')
    .replace(/, ,/g, ', ')
    .replace(/,+$/, '')
    .trim()


  return { positive, negative }
}

// Utility function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Tree manipulation helpers for drag-and-drop

/**
 * Find the parent array containing a node by its ID
 */
export function findParentArray(nodes: PromptNode[], nodeId: string): PromptNode[] | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return nodes;
    }
    if (node.type === 'group') {
      const found = findParentArray((node as GroupNode).value, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the index of a node in its parent array
 */
export function getNodeIndex(array: PromptNode[], nodeId: string): number {
  return array.findIndex(node => node.id === nodeId);
}

/**
 * Remove a node from the tree and return both the removed node and the updated tree
 */
export function removeNode(nodes: PromptNode[], nodeId: string): { node: PromptNode; updatedTree: PromptNode[] } | null {
  const parentArray = findParentArray(nodes, nodeId);
  if (!parentArray) return null;

  const index = getNodeIndex(parentArray, nodeId);
  if (index === -1) return null;

  const node = parentArray[index];
  const updatedTree = [...nodes];

  // If the node is in a nested array, we need to update that nested array
  if (parentArray !== nodes) {
    // Find the path to the parent group and update it
    const updateNestedArray = (ns: PromptNode[]): PromptNode[] => {
      return ns.map(n => {
        if (n.type === 'group') {
          const group = n as GroupNode;
          if (group.value.some(child => child.id === nodeId)) {
            return { ...group, value: group.value.filter(child => child.id !== nodeId) } as GroupNode;
          } else {
            return { ...group, value: updateNestedArray(group.value) } as GroupNode;
          }
        }
        return n;
      });
    };
    return { node, updatedTree: updateNestedArray(updatedTree) };
  } else {
    // Node is in the root array
    return { node, updatedTree: updatedTree.filter(n => n.id !== nodeId) };
  }
}

/**
 * Insert a node at a specific location in the tree
 */
export function insertNode(nodes: PromptNode[], targetNodeId: string, insertAfter: boolean, nodeToInsert: PromptNode): PromptNode[] {
  // First, find the target node
  const targetNode = findNodeById(nodes, targetNodeId);
  if (!targetNode) return nodes;

  const parentArray = findParentArray(nodes, targetNodeId);
  if (!parentArray) return nodes;

  const targetIndex = getNodeIndex(parentArray, targetNodeId);
  const insertIndex = targetIndex + (insertAfter ? 1 : 0);

  // Handle the special case: if target is an empty group, insert into the group
  if (targetNode.type === 'group' && (targetNode as GroupNode).value.length === 0 && !insertAfter) {
    const updateGroup = (ns: PromptNode[]): PromptNode[] => {
      return ns.map(n => {
        if (n.id === targetNodeId) {
          return { ...n, value: [nodeToInsert] } as GroupNode;
        } else if (n.type === 'group') {
          return { ...n, value: updateGroup((n as GroupNode).value) } as GroupNode;
        }
        return n;
      });
    };
    return updateGroup(nodes);
  }

  // Normal insertion into parent array
  if (parentArray === nodes) {
    // Insert into root array
    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, nodeToInsert);
    return newNodes;
  } else {
    // Insert into nested array
    const updateNestedArray = (ns: PromptNode[]): PromptNode[] => {
      return ns.map(n => {
        if (n.type === 'group') {
          const group = n as GroupNode;
          if (group.value.some(child => child.id === targetNodeId)) {
            const newValue = [...group.value];
            newValue.splice(insertIndex, 0, nodeToInsert);
            return { ...group, value: newValue } as GroupNode;
          } else {
            return { ...group, value: updateNestedArray(group.value) } as GroupNode;
          }
        }
        return n;
      });
    };
    return updateNestedArray(nodes);
  }
}

/**
 * Find a node by its ID in the tree
 */
export function findNodeById(nodes: PromptNode[], nodeId: string): PromptNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.type === 'group') {
      const found = findNodeById((node as GroupNode).value, nodeId);
      if (found) return found;
    }
  }
  return null;
}