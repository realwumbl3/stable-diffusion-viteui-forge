import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { cn } from '../../lib/utils.js'
import './PromptComposer.css'
import type { PromptComposerProps, PromptNode } from './types'
import { composePromptsFromNodes, generateId } from './utils/promptUtils'
import NodeField from './components/NodeField'
import ClearPromptButton from './components/ClearPromptButton'

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
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null)
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
    setDragOverPosition(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, node?: PromptNode) => {
    e.preventDefault()
    if (draggedNode) {
      // Allow dropping on empty areas
      if (!node) {
        setDragOverNode(null)
        setDragOverPosition(null)
        return
      }

      // Don't allow dropping on self or if the dragged node contains the target
      if (draggedNode.id === node.id) {
        setDragOverNode(null)
        setDragOverPosition(null)
        return
      }

      // Check if dropping on a group node
      if (node.type === 'group' && draggedNode.id !== node.id) {
        setDragOverNode(node)
        setDragOverPosition(null) // Groups handle their own positioning logic
      } else if (draggedNode.id !== node.id) {
        // For regular nodes, detect cursor position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const isTopHalf = e.clientY < rect.top + rect.height / 2
        setDragOverNode(node)
        setDragOverPosition(isTopHalf ? 'top' : 'bottom')
      }
    }
  }, [draggedNode])

  const handleDrop = useCallback((e: React.DragEvent, targetNode?: PromptNode, insertIndex?: number) => {
    e.preventDefault()
    if (!draggedNode) return

    // If dropping on empty space or specific insert position, move to specified position
    if (!targetNode) {
      const fromIndex = nodes.findIndex(n => n.id === draggedNode.id)
      if (fromIndex !== -1) {
        const targetIndex = insertIndex !== undefined ? insertIndex : nodes.length
        moveNode(fromIndex, targetIndex)
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
      // If group is empty, add node to group
      if (targetNode.value.length === 0) {
        moveNodeToGroup(draggedNode, targetNode, 0)
      } else {
        // If group has nodes, use top/bottom behavior
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
      }
    } else {
      // Regular node reordering
      const fromIndex = nodes.findIndex(n => n.id === draggedNode.id)
      const toIndex = nodes.findIndex(n => n.id === targetNode.id)

      if (fromIndex !== -1 && toIndex !== -1) {
        // Use the dragOverPosition that was set during drag over
        const adjustedToIndex = dragOverPosition === 'bottom' ? toIndex + 1 : toIndex
        moveNode(fromIndex, adjustedToIndex)
      }
    }

    setDraggedNode(null)
    setDragOverNode(null)
    setDragOverPosition(null)
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

  const handleNodesChange = useCallback((newNodes: PromptNode[]) => {
    setNodes(newNodes)
    setModified(true)
    onNodesChange?.(newNodes)
  }, [onNodesChange])

  const moveNode = useCallback((fromIndex: number, toIndex: number) => {
    const newNodes = [...nodes]
    const [moved] = newNodes.splice(fromIndex, 1)
    // Adjust target index when moving down to account for removal.
    const normalizedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
    const clampedToIndex = Math.max(0, Math.min(normalizedToIndex, newNodes.length))
    newNodes.splice(clampedToIndex, 0, moved)
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
              dragOverPosition={dragOverPosition}
              setDraggedNode={setDraggedNode}
              setDragOverNode={setDragOverNode}
              setDragOverPosition={setDragOverPosition}
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