import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { cn } from "../../lib/utils.js";
import "./PromptComposer.css";
import type { PromptComposerProps, PromptNode, GroupNode, TextNode } from "./types";
import { composePromptsFromNodes, generateId } from "./utils/promptUtils";
import NodeField from "./components/NodeField";
import ClearPromptButton from "./components/ClearPromptButton";

function PromptComposer({
    className,
    onPromptChange,
    onNegativePromptChange,
    onNodesChange,
    initialData = [],
}: PromptComposerProps) {
    const [nodes, setNodes] = useState<PromptNode[]>(initialData);
    // Map from DOM elements to nodes (like liveDomList in vanilla JS)
    const nodeMapRef = useRef<Map<HTMLElement, { node: PromptNode; field: PromptNode[] }>>(new Map());
    // Drag state stores DOM elements (like vanilla JS)
    const dragStateRef = useRef<{
        dragTarget: HTMLElement | null;
        lastDragged: HTMLElement | null;
    }>({
        dragTarget: null,
        lastDragged: null,
    });
    const [modified, setModified] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonImportText, setJsonImportText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    // Helper to get node and field from DOM element
    const getNodeFromElement = (element: HTMLElement | null): { node: PromptNode; field: PromptNode[] } | null => {
        if (!element) return null;
        const nodeElement = element.closest('.node') as HTMLElement;
        if (!nodeElement) return null;
        return nodeMapRef.current.get(nodeElement) || null;
    };

    // Helper to find a field in the tree by a node ID it contains
    const findFieldInTree = (ns: PromptNode[], nodeId: string): PromptNode[] | null => {
        for (const node of ns) {
            if (node.id === nodeId) return ns;
            if (node.type === "group") {
                const found = findFieldInTree((node as GroupNode).value, nodeId);
                if (found) return found;
            }
        }
        return null;
    };

    // Helper functions for tree operations
    const removeNodeFromTree = (nodes: PromptNode[], nodeId: string): PromptNode[] => {
        return nodes
            .filter(node => node.id !== nodeId)
            .map(node => {
                if (node.type === "group") {
                    return {
                        ...node,
                        value: removeNodeFromTree((node as GroupNode).value, nodeId),
                    } as GroupNode;
                }
                return node;
            });
    };

    const updateNodeInTree = (nodes: PromptNode[], nodeId: string, updatedNode: PromptNode): PromptNode[] => {
        return nodes.map(node => {
            if (node.id === nodeId) {
                return updatedNode;
            } else if (node.type === "group") {
                return {
                    ...node,
                    value: updateNodeInTree((node as GroupNode).value, nodeId, updatedNode),
                } as GroupNode;
            }
            return node;
        });
    };

    const handleNodesChange = useCallback(
        (newNodes: PromptNode[]) => {
            setNodes(newNodes);
            setModified(true);
            onNodesChange?.(newNodes);
        },
        [onNodesChange]
    );

    // Drag reorder function (must be defined before handleDragEnd)
    const dragReorder = useCallback((e: React.DragEvent | MouseEvent) => {
        const { dragTarget, lastDragged } = dragStateRef.current;
        if (!dragTarget || !lastDragged) return;

        const draggedData = getNodeFromElement(dragTarget);
        const targetData = getNodeFromElement(lastDragged);
        
        if (!draggedData || !targetData) return;
        
        const { node: draggedNode, field: draggedField } = draggedData;
        const { node: targetNode, field: targetField } = targetData;

        // Handle empty group case
        if (targetNode.type === "group" && (targetNode as GroupNode).value.length < 1) {
            const newNodes = removeNodeFromTree(nodes, draggedNode.id);
            const updatedGroup = {
                ...targetNode,
                value: [draggedNode],
            } as GroupNode;
            const finalNodes = updateNodeInTree(newNodes, targetNode.id, updatedGroup);
            handleNodesChange(finalNodes);
            return;
        }

        // Calculate drop position
        const rect = lastDragged.getBoundingClientRect();
        const heightHalf = lastDragged.offsetHeight / 2;
        const clientY = 'clientY' in e ? e.clientY : (e as MouseEvent).clientY;
        const atBottomHalf = clientY - rect.top > heightHalf;

        // Remove node from tree first
        let newNodes = removeNodeFromTree(nodes, draggedNode.id);
        
        // Find the target field in the new tree by searching for the target node
        const targetFieldAfterRemoval = targetField === nodes 
            ? newNodes 
            : findFieldInTree(newNodes, targetNode.id);
        
        if (!targetFieldAfterRemoval) {
            handleNodesChange(newNodes);
            return;
        }
        
        const targetIndex = targetFieldAfterRemoval.findIndex(n => n.id === targetNode.id);
        const insertIndex = targetIndex + (atBottomHalf ? 1 : 0);
        
        // Insert into the correct field
        if (targetField === nodes) {
            // Root field
            newNodes.splice(insertIndex, 0, draggedNode);
        } else {
            // Nested field - find the parent group containing targetNode and update it
            const updateFieldInTree = (ns: PromptNode[]): PromptNode[] => {
                return ns.map(node => {
                    if (node.type === "group") {
                        const groupValue = (node as GroupNode).value;
                        // Check if targetNode is in this group's value
                        if (groupValue.some(n => n.id === targetNode.id)) {
                            const newValue = [...groupValue];
                            const idx = newValue.findIndex(n => n.id === targetNode.id);
                            newValue.splice(idx + (atBottomHalf ? 1 : 0), 0, draggedNode);
                            return { ...node, value: newValue } as GroupNode;
                        } else {
                            return { ...node, value: updateFieldInTree(groupValue) } as GroupNode;
                        }
                    }
                    return node;
                });
            };
            newNodes = updateFieldInTree(newNodes);
        }
        
        handleNodesChange(newNodes);
    }, [nodes, handleNodesChange]);

    // Event delegation handlers (like vanilla JS)
    const handleDragStart = useCallback((e: React.DragEvent) => {
        const target = e.target as HTMLElement;
        if (!target.matches('.thumb')) return;
        
        const nodeElement = target.closest('.node') as HTMLElement;
        if (!nodeElement) return;
        
        dragStateRef.current.dragTarget = nodeElement;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        if (!dragStateRef.current.dragTarget) return;
        e.preventDefault();
        
        const nodeElement = (e.target as HTMLElement).closest('.node') as HTMLElement;
        if (!nodeElement || dragStateRef.current.lastDragged === nodeElement) return;
        
        // Prevent dropping into self or descendants
        if (dragStateRef.current.dragTarget.contains(nodeElement)) return;
        
        dragStateRef.current.lastDragged = nodeElement;
        
        // Visual feedback
        nodeElement.style.borderColor = 'cyan';
        if (dragStateRef.current.lastDragged && dragStateRef.current.lastDragged !== nodeElement) {
            (dragStateRef.current.lastDragged as HTMLElement).style.borderColor = '';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        if (!dragStateRef.current.dragTarget) return;
        e.preventDefault();
        
        if (!dragStateRef.current.lastDragged) {
            dragStateRef.current.dragTarget = null;
            dragStateRef.current.lastDragged = null;
            return;
        }
        
        if (dragStateRef.current.lastDragged !== dragStateRef.current.dragTarget) {
            dragReorder(e);
        }
        
        // Reset visual feedback
        if (dragStateRef.current.dragTarget) {
            (dragStateRef.current.dragTarget as HTMLElement).style.borderColor = '';
        }
        if (dragStateRef.current.lastDragged) {
            (dragStateRef.current.lastDragged as HTMLElement).style.borderColor = '';
        }
        
        dragStateRef.current.dragTarget = null;
        dragStateRef.current.lastDragged = null;
    }, [dragReorder]);

    const exportToJson = useCallback(() => {
        const jsonString = JSON.stringify(nodes, null, 2);
        navigator.clipboard.writeText(jsonString);
    }, [nodes]);

    const importFromJson = useCallback(() => {
        setShowJsonImport(true);
        setJsonImportText("");
    }, []);

    const composePrompt = useCallback(() => {
        const { positive, negative } = composePromptsFromNodes(nodes);
        onPromptChange?.(positive);
        onNegativePromptChange?.(negative);
        setModified(false);
    }, [nodes, onPromptChange, onNegativePromptChange]);



    const handleJsonImport = useCallback(() => {
        if (!jsonImportText.trim()) {
            console.error("Please enter JSON data");
            return;
        }

        try {
            const data = JSON.parse(jsonImportText.trim());
            if (Array.isArray(data)) {
                setNodes(data as PromptNode[]);
                setModified(true);
                setShowJsonImport(false);
            } else {
                console.error("Invalid JSON format - expected array", data);
            }
        } catch (e) {
            console.error("Invalid JSON syntax", e);
        }
    }, [jsonImportText]);

    // Function to load data from a prompt that contains embedded data
    const loadFromPrompt = useCallback((promptText: string) => {
        const match = promptText.match(/<betterpromptexport:([^>]+)>/);
        if (match) {
            try {
                const encodedData = match[1];
                const decodedData = JSON.parse(atob(encodedData));
                if (Array.isArray(decodedData)) {
                    setNodes(decodedData);
                    setModified(true);
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Enter to compose
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                composePrompt();
            }
            // Ctrl+E to export
            if (e.ctrlKey && e.key === "e") {
                e.preventDefault();
                exportToJson();
            }
            // Ctrl+I to import
            if (e.ctrlKey && e.key === "i") {
                e.preventDefault();
                importFromJson();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [composePrompt, exportToJson, importFromJson]);

    const clearNodes = useCallback(() => {
        setNodes([]);
        setModified(true);
    }, []);

    const loadFromFile = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.txt";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    try {
                        // Try to parse as JSON first
                        const data = JSON.parse(content);
                        if (Array.isArray(data)) {
                            setNodes(data);
                            setModified(true);
                        }
                    } catch {
                        // If not JSON, treat as plain text and create a text node
                        const textNode: TextNode = {
                            id: generateId(),
                            type: "text",
                            name: "Imported Text",
                            hidden: false,
                            weight: 1,
                            value: content,
                        };
                        setNodes([textNode]);
                        setModified(true);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }, [generateId]);

    return (
        <div className={cn("prompt-composer", className)}>
            <div className="better-prompt-container">
                <div className="better-prompt">
                    {/* Header */}

                    {/* Main Editor */}
                    <div 
                        className="main-editor"
                        ref={editorRef}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleDragEnd}
                    >
                        <NodeField
                            nodes={nodes}
                            onChange={handleNodesChange}
                            generateId={generateId}
                            nodeMapRef={nodeMapRef}
                        />
                    </div>

                    {/* Footer */}
                    <div className="editor-footer">
                        <div className="left-side">
                            <button className={cn("compose", { modified })} onClick={composePrompt}>
                                COMPOSE
                            </button>
                            <div className="column">
                                <div className="row manage">
                                    <ClearPromptButton onClear={clearNodes} />
                                    <button className="button" onClick={exportToJson}>
                                        export
                                    </button>
                                    <button className="button" onClick={importFromJson}>
                                        import
                                    </button>
                                    <button className="button" onClick={loadFromFile}>
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
    );
}

export default memo(PromptComposer);
