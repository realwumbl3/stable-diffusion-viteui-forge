import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { cn } from '../lib/utils.js'
import './PromptComposer.css'

// Eye Icon Component
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

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

interface PromptComposerProps {
  className?: string
  onPromptChange?: (prompt: string) => void
  onNegativePromptChange?: (negativePrompt: string) => void
  onNodesChange?: (nodes: PromptNode[]) => void
  initialData?: PromptNode[]
  showDemoButton?: boolean
  showKeyboardHints?: boolean
}

function PromptComposer({
  className,
  onPromptChange,
  onNegativePromptChange,
  onNodesChange,
  initialData = [],
  showDemoButton = true,
  showKeyboardHints = true
}: PromptComposerProps) {
  const [nodes, setNodes] = useState<PromptNode[]>(initialData)
  const [draggedNode, setDraggedNode] = useState<PromptNode | null>(null)
  const [draggedNodeField, setDraggedNodeField] = useState<PromptNode[] | null>(null)
  const [dragOverNode, setDragOverNode] = useState<PromptNode | null>(null)
  const [hint, setHint] = useState('')
  const [modified, setModified] = useState(false)
  const [showJsonImport, setShowJsonImport] = useState(false)
  const [jsonImportText, setJsonImportText] = useState('')
  const hintTimeoutRef = useRef<NodeJS.Timeout>()

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => {
    setDraggedNode(node)
    setDraggedNodeField(sourceField)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedNode(null)
    setDraggedNodeField(null)
    setDragOverNode(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, node?: PromptNode) => {
    e.preventDefault()
    if (draggedNode) {
      // Allow dropping on empty areas
      if (!node) {
        setDragOverNode(null)
        return
      }

      // Don't allow dropping on self or if the dragged node contains the target
      if (draggedNode.id === node.id) {
        setDragOverNode(null)
        return
      }

      // Check if dropping on a group node
      if (node.type === 'group' && draggedNode.id !== node.id) {
        setDragOverNode(node)
      } else if (draggedNode.id !== node.id) {
        setDragOverNode(node)
      }
    }
  }, [draggedNode])

  const handleDrop = useCallback((e: React.DragEvent, targetNode?: PromptNode) => {
    e.preventDefault()
    if (!draggedNode) return

    // If dropping on empty space, move to end
    if (!targetNode) {
      const fromIndex = nodes.findIndex(n => n.id === draggedNode.id)
      if (fromIndex !== -1) {
        moveNode(fromIndex, nodes.length - 1)
      }
      setDraggedNode(null)
      setDragOverNode(null)
      return
    }

    if (draggedNode.id === targetNode.id) {
      setDraggedNode(null)
      setDragOverNode(null)
      return
    }

    // Check if dropping on a group
    if (targetNode.type === 'group') {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const heightHalf = rect.height / 2
      const atBottomHalf = e.clientY - rect.top > heightHalf

      if (!atBottomHalf) {
        // Drop in top half - move into group
        moveNodeToGroup(draggedNode, targetNode, 0)
      } else {
        // Drop in bottom half - move next to group
        const toIndex = nodes.findIndex(n => n.id === targetNode.id)
        if (toIndex !== -1) {
          const fromIndex = nodes.findIndex(n => n.id === draggedNode.id)
          if (fromIndex !== -1) {
            moveNode(fromIndex, toIndex + 1)
          }
        }
      }
    } else {
      // Regular node reordering
      const fromIndex = nodes.findIndex(n => n.id === draggedNode.id)
      const toIndex = nodes.findIndex(n => n.id === targetNode.id)

      if (fromIndex !== -1 && toIndex !== -1) {
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        const heightHalf = rect.height / 2
        const atBottomHalf = e.clientY - rect.top > heightHalf
        const adjustedToIndex = toIndex + (atBottomHalf ? 1 : 0)
        moveNode(fromIndex, adjustedToIndex)
      }
    }

    setDraggedNode(null)
    setDragOverNode(null)
  }, [draggedNode, nodes])

  const showHint = useCallback((text: string, duration = 2000) => {
    setHint(text)
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
    }
    hintTimeoutRef.current = setTimeout(() => setHint(''), duration)
  }, [])

  const exportToJson = useCallback(() => {
    const jsonString = JSON.stringify(nodes, null, 2)
    navigator.clipboard.writeText(jsonString)
    showHint('Copied to clipboard')
  }, [nodes, showHint])

  const importFromJson = useCallback(() => {
    setShowJsonImport(true)
    setJsonImportText('')
  }, [])

  const composePrompt = useCallback(() => {
    const { positive, negative } = composePromptsFromNodes(nodes)
    onPromptChange?.(positive)
    onNegativePromptChange?.(negative)
    setModified(false)
  }, [nodes, onPromptChange, onNegativePromptChange])


  const generateId = () => Math.random().toString(36).substr(2, 9)

  const handleNodesChange = useCallback((newNodes: PromptNode[]) => {
    setNodes(newNodes)
    setModified(true)
    onNodesChange?.(newNodes)
  }, [onNodesChange])

  const moveNode = useCallback((fromIndex: number, toIndex: number) => {
    const newNodes = [...nodes]
    const [moved] = newNodes.splice(fromIndex, 1)
    newNodes.splice(toIndex, 0, moved)
    handleNodesChange(newNodes)
  }, [nodes, handleNodesChange])

  // Handle moving node to a group
  const moveNodeToGroup = useCallback((draggedNode: PromptNode, targetGroup: GroupNode, insertIndex: number = 0) => {
    if (!draggedNodeField) return

    // Remove from current location
    const removeNodeFromTree = (nodes: PromptNode[]): PromptNode[] => {
      return nodes
        .filter(node => node.id !== draggedNode.id)
        .map(node => {
          if (node.type === 'group') {
            return {
              ...node,
              value: removeNodeFromTree((node as GroupNode).value)
            } as GroupNode
          }
          return node
        })
    }

    const newNodes = removeNodeFromTree(draggedNodeField)
    handleNodesChange(newNodes)

    // Add to target group
    const updatedGroup = {
      ...targetGroup,
      value: [...targetGroup.value]
    }
    updatedGroup.value.splice(insertIndex, 0, draggedNode)

    // Find and update the target group in the tree
    const updateGroupInTree = (nodes: PromptNode[]): PromptNode[] => {
      return nodes.map(node => {
        if (node.id === targetGroup.id) {
          return updatedGroup
        } else if (node.type === 'group') {
          return {
            ...node,
            value: updateGroupInTree((node as GroupNode).value)
          } as GroupNode
        }
        return node
      })
    }

    const finalNodes = updateGroupInTree(newNodes)
    handleNodesChange(finalNodes)
  }, [draggedNodeField, handleNodesChange])

  const handleJsonImport = useCallback(() => {
    if (!jsonImportText.trim()) {
      showHint('Please enter JSON data')
      return
    }

    try {
      const data = JSON.parse(jsonImportText.trim())
      if (Array.isArray(data)) {
        setNodes(data as PromptNode[])
        setModified(true)
        showHint('Imported successfully')
        setShowJsonImport(false)
      } else {
        showHint('Invalid JSON format - expected array')
      }
    } catch (e) {
      showHint('Invalid JSON syntax')
    }
  }, [jsonImportText, showHint])

  // Function to load data from a prompt that contains embedded data
  const loadFromPrompt = useCallback((promptText: string) => {
    const match = promptText.match(/<betterpromptexport:([^>]+)>/)
    if (match) {
      try {
        const encodedData = match[1]
        const decodedData = JSON.parse(atob(encodedData))
        if (Array.isArray(decodedData)) {
          setNodes(decodedData)
          setModified(true)
          showHint('Loaded from embedded data')
          return true
        }
      } catch (e) {
        showHint('Failed to load embedded data')
      }
    }
    return false
  }, [showHint])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to compose
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        composePrompt()
      }
      // Ctrl+E to export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        exportToJson()
      }
      // Ctrl+I to import
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault()
        importFromJson()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [composePrompt, exportToJson, importFromJson, showHint])

  // Remove duplicate functions that appear later in the file
  // ... rest of component

  const clearNodes = useCallback(() => {
    setNodes([])
    setModified(true)
  }, [])


  const loadFromFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          try {
            // Try to parse as JSON first
            const data = JSON.parse(content)
            if (Array.isArray(data)) {
              setNodes(data)
              setModified(true)
              showHint('Loaded from file')
            }
          } catch {
            // If not JSON, treat as plain text and create a text node
            const textNode: TextNode = {
              id: generateId(),
              type: 'text',
              name: 'Imported Text',
              hidden: false,
              weight: 1,
              value: content
            }
            setNodes([textNode])
            setModified(true)
            showHint('Loaded as text node')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [showHint])

  return (
    <div className={cn('prompt-composer', className)}>
      <div className="better-prompt-container">
        <div className="better-prompt">
          {/* Header */}

          {/* Main Editor */}
          <div className="main-editor">
            <NodeField
              nodes={nodes}
              onChange={handleNodesChange}
              draggedNode={draggedNode}
              dragOverNode={dragOverNode}
              setDraggedNode={setDraggedNode}
              setDragOverNode={setDragOverNode}
              showHint={showHint}
              generateId={generateId}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
            />
          </div>

          {/* Footer */}
          <div className="editor-footer">
            <div className="left-side">
              <button
                className={cn('compose', { modified })}
                onClick={composePrompt}
                onMouseEnter={() => showHint("Compose the prompt into the text area")}
              >
                COMPOSE
              </button>
              <div className="column">
                <div className="row manage">
                  <ClearPromptButton onClear={clearNodes} showHint={showHint} />
                  <button
                    className="button"
                    onClick={exportToJson}
                    onMouseEnter={() => showHint("Export the current prompt to your clipboard as json")}
                  >
                    export
                  </button>
                  <button
                    className="button"
                    onClick={importFromJson}
                    onMouseEnter={() => showHint("Import a prompt using normal / encoded json")}
                  >
                    import
                  </button>
                  <button
                    className="button"
                    onClick={loadFromFile}
                    onMouseEnter={() => showHint("Load a prompt from a stable-diffusion output file (exif metadata), or a json file")}
                  >
                    load file
                  </button>
                </div>
              </div>
            </div>
            <div className="right-side"></div>
          </div>
        </div>
      </div>

      {/* JSON Import Dialog */}
      {showJsonImport && (
        <div className="json-import-overlay" onClick={() => setShowJsonImport(false)}>
          <div className="json-import-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Import JSON</h3>
            <textarea
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder="Paste your JSON data here..."
              rows={10}
              className="json-import-textarea"
            />
            <div className="json-import-buttons">
              <button className="button" onClick={() => setShowJsonImport(false)}>
                Cancel
              </button>
              <button className="button" onClick={handleJsonImport}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(PromptComposer)

// Helper function to compose prompts from nodes (returns { positive: string, negative: string })
function composePromptsFromNodes(nodes: PromptNode[]): { positive: string, negative: string } {
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

// NodeField component for managing a collection of nodes
interface NodeFieldProps {
  nodes: PromptNode[]
  onChange: (nodes: PromptNode[]) => void
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
  showHint: (text: string, duration?: number) => void
  generateId: () => string
  parentNode?: PromptNode
  handleDragStart?: (e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => void
  handleDragEnd?: () => void
  handleDragOver?: (e: React.DragEvent, node?: PromptNode) => void
  handleDrop?: (e: React.DragEvent, targetNode?: PromptNode) => void
}

function NodeField({
  nodes,
  onChange,
  draggedNode,
  dragOverNode,
  setDraggedNode,
  setDragOverNode,
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
  })

  const actualHandleDrop = customHandleDrop || ((e: React.DragEvent, targetNode?: PromptNode) => {
    e.preventDefault()
    // Default drop behavior for nested NodeFields
  })

  return (
    <div
      className="node-field"
      onDragOver={(e) => actualHandleDragOver(e)}
      onDrop={(e) => actualHandleDrop(e)}
    >
      {nodes.map((node, index) => (
        <NodeComponent
          key={node.id}
          node={node}
          index={index}
          onUpdate={(updates) => updateNode(node.id, updates)}
          onRemove={() => removeNode(node.id)}
          onAddNode={(type, insertIndex) => addNode(type, insertIndex)}
          onDragStart={(e) => actualHandleDragStart(e, node, nodes)}
          onDragEnd={actualHandleDragEnd}
          onDragOver={(e) => actualHandleDragOver(e, node)}
          onDrop={(e) => actualHandleDrop(e, node)}
          isDragged={draggedNode?.id === node.id}
          isDragOver={dragOverNode?.id === node.id}
          showHint={showHint}
          generateId={generateId}
          draggedNode={draggedNode}
          dragOverNode={dragOverNode}
          setDraggedNode={setDraggedNode}
          setDragOverNode={setDragOverNode}
        />
      ))}
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
      {/* Invisible drop zone for empty areas */}
      {nodes.length > 0 && (
        <div
          className="drop-zone"
          onDragOver={(e) => {
            e.preventDefault()
            if (draggedNode) {
              e.currentTarget.classList.add('active')
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('active')
          }}
          onDrop={(e) => {
            e.currentTarget.classList.remove('active')
            actualHandleDrop(e)
          }}
        />
      )}
    </div>
  )
}

// Individual node components
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
  showHint,
  generateId,
  draggedNode,
  dragOverNode,
  setDraggedNode,
  setDragOverNode
}: {
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
  showHint: (text: string, duration?: number) => void
  generateId: () => string
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
}) {
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
          setDraggedNode={setDraggedNode}
          setDragOverNode={setDragOverNode}
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
      className={cn('node', { muted: node.hidden, dragged: isDragged, 'drag-over': isDragOver })}
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

      <div className="node-area">
        {renderNodeContent()}
      </div>
    </div>
  )
}

// Tags Node Content
function TagsNodeContent({
  node,
  onUpdate,
  showHint
}: {
  node: TagsNode
  onUpdate: (updates: Partial<TagsNode>) => void
  showHint: (text: string) => void
}) {
  const tagRefs = useRef<(HTMLInputElement | null)[]>([])

  const addTag = (value = '', focusNew = false) => {
    const newTag: Tag = { value, weight: 1 }
    const newTags = [...node.value, newTag]
    onUpdate({ value: newTags })

    // Focus the new tag if requested
    if (focusNew) {
      setTimeout(() => {
        const newTagIndex = newTags.length - 1
        if (tagRefs.current[newTagIndex]) {
          tagRefs.current[newTagIndex]?.focus()
        }
      }, 0)
    }
  }

  const updateTag = (index: number, updates: Partial<Tag>) => {
    const newValue = [...node.value]
    newValue[index] = { ...newValue[index], ...updates }
    onUpdate({ value: newValue })
  }

  const removeTag = (index: number) => {
    if (node.value.length > 1) {
      onUpdate({ value: node.value.filter((_, i) => i !== index) })
    }
  }

  return (
    <div className="tags-node-container">
      <div className="tags-node">
        {node.value.map((tag, index) => (
          <TagComponent
            key={index}
            ref={(el) => tagRefs.current[index] = el}
            tag={tag}
            onUpdate={(updates) => updateTag(index, updates)}
            onRemove={() => removeTag(index)}
            onAddTag={(value, focusNew) => addTag(value, focusNew)}
            showHint={showHint}
          />
        ))}
        <button
          className="button add-tag-button"
          onClick={() => addTag('')}
          onMouseEnter={() => showHint("Add a new tag")}
        >
          +
        </button>
      </div>
    </div>
  )
}

// Text Node Content
function TextNodeContent({
  node,
  onUpdate
}: {
  node: TextNode
  onUpdate: (updates: Partial<TextNode>) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = () => {
    if (textareaRef.current) {
      onUpdate({ value: textareaRef.current.value })
      adjustHeight()
    }
  }

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = Math.max(textareaRef.current.scrollHeight, 58)
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [node.value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowUp') {
      const newWeight = Math.min(1.7, Number((node.weight + 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    } else if (e.altKey && e.key === 'ArrowDown') {
      const newWeight = Math.max(-1.7, Number((node.weight - 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    }
  }

  const weightClass = node.weight === 1 ? 'neutral' : node.weight > 1 ? 'positive' : 'negative'

  return (
    <div className={cn('text-node-container', weightClass)} style={{ '--weight': node.weight } as React.CSSProperties}>
      <div className="weight-indicator">{node.weight}</div>
      <textarea
        ref={textareaRef}
        className="basic-text"
        value={node.value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Enter your prompt text here..."
        style={{ height: '42px' }}
      />
    </div>
  )
}

// Group Node Content
function GroupNodeContent({
  node,
  onUpdate,
  showHint,
  generateId,
  draggedNode,
  dragOverNode,
  setDraggedNode,
  setDragOverNode,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop
}: {
  node: GroupNode
  onUpdate: (updates: Partial<GroupNode>) => void
  showHint: (text: string) => void
  generateId: () => string
  draggedNode: PromptNode | null
  dragOverNode: PromptNode | null
  setDraggedNode: (node: PromptNode | null) => void
  setDragOverNode: (node: PromptNode | null) => void
  handleDragStart: (e: React.DragEvent, node: PromptNode, sourceField: PromptNode[]) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, node?: PromptNode) => void
  handleDrop: (e: React.DragEvent, targetNode?: PromptNode) => void
}) {
  const handleNodesChange = (newNodes: PromptNode[]) => {
    onUpdate({ value: newNodes })
  }

  return (
    <div className="group">
      <NodeField
        nodes={node.value}
        onChange={handleNodesChange}
        draggedNode={draggedNode}
        dragOverNode={dragOverNode}
        setDraggedNode={setDraggedNode}
        setDragOverNode={setDragOverNode}
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

// Break Node Content
function BreakNodeContent({
  node,
  onUpdate
}: {
  node: BreakNode
  onUpdate: (updates: Partial<BreakNode>) => void
}) {
  const handleChange = (value: BreakNode['value']) => {
    onUpdate({ value })
  }

  return (
    <form className="options" onChange={(e) => handleChange((e.target as HTMLInputElement).value as BreakNode['value'])}>
      <label>
        <input type="radio" name="break-type" value="break" defaultChecked={node.value === 'break'} />
        Break
      </label>
      <label>
        <input type="radio" name="break-type" value="addcomm" defaultChecked={node.value === 'addcomm'} />
        Common
      </label>
      <label>
        <input type="radio" name="break-type" value="addrow" defaultChecked={node.value === 'addrow'} />
        Row
      </label>
      <label>
        <input type="radio" name="break-type" value="addcol" defaultChecked={node.value === 'addcol'} />
        Col
      </label>
    </form>
  )
}

// Individual Tag Component
const TagComponent = React.forwardRef<HTMLInputElement, {
  tag: Tag
  onUpdate: (updates: Partial<Tag>) => void
  onRemove: () => void
  onAddTag: (value?: string, focusNew?: boolean) => void
  showHint: (text: string) => void
}>(({
  tag,
  onUpdate,
  onRemove,
  onAddTag,
  showHint
}, ref) => {
  const [inputValue, setInputValue] = useState(tag.value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Forward the ref to the input element
  React.useImperativeHandle(ref, () => inputRef.current!)

  useEffect(() => {
    setInputValue(tag.value)
  }, [tag.value])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    onUpdate({ value })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddTag('', true) // Pass true to focus the new tag
    } else if (e.key === 'Backspace' && inputValue === '') {
      onRemove()
    } else if (e.altKey && e.key === 'ArrowUp') {
      const newWeight = Math.min(1.7, Number((tag.weight + 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    } else if (e.altKey && e.key === 'ArrowDown') {
      const newWeight = Math.max(-1.7, Number((tag.weight - 0.05).toFixed(2)))
      onUpdate({ weight: newWeight })
      e.preventDefault()
    }
  }

  const isLora = tag.value.startsWith('<') && tag.value.endsWith('>')
  const weightClass = tag.weight === 1 ? 'neutral' : tag.weight > 1 ? 'positive' : 'negative'

  return (
    <div
      className={cn('tag', weightClass, { lora: isLora })}
      style={{ '--weight': tag.weight } as React.CSSProperties}
    >
      <div className="weight-indicator">{tag.weight}</div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter tag..."
      />
      <button
        className="remove"
        onClick={onRemove}
        onMouseEnter={() => showHint("Remove this tag")}
      >
        X
      </button>
    </div>
  )
})

// Clear prompt button component
function ClearPromptButton({ onClear, showHint }: { onClear: () => void, showHint: (text: string) => void }) {
  const [active, setActive] = useState(false)

  const handleClear = () => {
    if (active) {
      onClear()
      setActive(false)
    } else {
      setActive(true)
    }
  }

  const handleCancel = () => setActive(false)

  return (
    <div className={cn('clear-prompt', { active })}>
      <button
        className="button clear"
        onClick={handleClear}
        onMouseEnter={() => showHint("Clear the prompt")}
      >
        Clear
      </button>
      <button
        className="button cancel"
        onClick={handleCancel}
      >
        No
      </button>
      <button
        className="button confirm"
        onClick={() => {
          onClear()
          setActive(false)
        }}
      >
        Yes
      </button>
    </div>
  )
}