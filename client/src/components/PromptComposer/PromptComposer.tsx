import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { cn } from "../../lib/utils";
import "./PromptComposer.css";
import type { PromptComposerProps, PromptNode, GroupNode, TextNode } from "./types";
import { composePromptsFromNodes, generateId, removeNode, insertNode, findNodeById } from "./utils/promptUtils";
import { decodeLegacy } from "./utils/legacyEncoding";
import NodeField from "./components/NodeField";
import ClearPromptButton from "./components/ClearPromptButton";
import { usePromptComposerStore } from "./store";

function PromptComposer({
    className,
    onPromptChange,
    onNegativePromptChange,
    onNodesChange,
    initialData = [],
}: PromptComposerProps) {
    const { nodes, setNodes } = usePromptComposerStore(initialData);
    // Simple drag state like vanilla JS
    const dragStateRef = useRef<{
        lastDragged: HTMLElement | null;
        dragTarget: HTMLElement | null;
    }>({
        lastDragged: null,
        dragTarget: null,
    });
    const [modified, setModified] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonImportText, setJsonImportText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    // Helper to get node ID from DOM element
    const getNodeIdFromElement = (element: HTMLElement | null): string | null => {
        if (!element) return null;
        const nodeElement = element.closest(".node") as HTMLElement;
        if (!nodeElement) return null;
        return nodeElement.dataset.nodeId || null;
    };

    const handleNodesChange = useCallback(
        (newNodes: PromptNode[]) => {
            setNodes(newNodes);
            setModified(true);
            onNodesChange?.(newNodes);
        },
        [onNodesChange]
    );

    // Drag reorder function (simplified like vanilla JS)
    const dragReorder = useCallback(
        (e: React.DragEvent | MouseEvent) => {
            const { lastDragged, dragTarget } = dragStateRef.current;
            if (!lastDragged || !dragTarget) return;

            const draggedNodeId = getNodeIdFromElement(dragTarget);
            const targetNodeId = getNodeIdFromElement(lastDragged);

            if (!draggedNodeId || !targetNodeId || draggedNodeId === targetNodeId) return;

            // Check if trying to drop into self or descendant
            if (dragTarget.contains(lastDragged)) return;

            const targetNode = findNodeById(nodes, targetNodeId);
            if (!targetNode) return;

            // Calculate drop position
            const rect = lastDragged.getBoundingClientRect();
            const heightHalf = lastDragged.offsetHeight / 2;
            const clientY = "clientY" in e ? e.clientY : (e as MouseEvent).clientY;
            const atBottomHalf = clientY - rect.top > heightHalf;

            // Remove the dragged node from the tree
            const removalResult = removeNode(nodes, draggedNodeId);
            if (!removalResult) return;

            const { node: draggedNode } = removalResult;

            // Insert at the new location
            const newNodes = insertNode(removalResult.updatedTree, targetNodeId, atBottomHalf, draggedNode);
            handleNodesChange(newNodes);
        },
        [nodes, handleNodesChange]
    );

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        if (!dragStateRef.current.dragTarget) return;
        e.preventDefault();

        const nodeElement = (e.target as HTMLElement).closest(".node") as HTMLElement;
        if (!nodeElement || dragStateRef.current.lastDragged === nodeElement) return;

        // Prevent dropping into self or descendants
        if (dragStateRef.current.dragTarget.contains(nodeElement)) return;

        dragStateRef.current.lastDragged = nodeElement;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (!dragStateRef.current.dragTarget) return;
        e.preventDefault();

        const nodeElement = (e.target as HTMLElement).closest(".node") as HTMLElement;

        // Clear ALL indicators first to ensure only one node shows feedback at a time
        const allNodes = editorRef.current?.querySelectorAll(".node");
        allNodes?.forEach((node) => {
            node.classList.remove("drag-over-top", "drag-over-bottom");
        });

        if (!nodeElement) {
            // Mouse is not over any node, clear lastDragged reference
            dragStateRef.current.lastDragged = null;
            return;
        }

        // Update the last dragged reference
        dragStateRef.current.lastDragged = nodeElement;

        // Add visual feedback based on mouse position
        const rect = nodeElement.getBoundingClientRect();
        const heightHalf = rect.height / 2;
        const isTopHalf = e.clientY - rect.top < heightHalf;

        nodeElement.classList.add(isTopHalf ? "drag-over-top" : "drag-over-bottom");
    }, []);

    // Event delegation handlers (like vanilla JS)
    const handleDragStart = useCallback((e: React.DragEvent) => {
        const target = e.target as HTMLElement;
        if (!target.matches(".thumb")) return;

        const nodeElement = target.closest(".node") as HTMLElement;
        if (!nodeElement) return;

        dragStateRef.current.dragTarget = nodeElement;
        nodeElement.classList.add("dragged");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
    }, []);

    const handleDragEnd = useCallback(
        (e: React.DragEvent) => {
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

            // Reset all visual feedback - clear from tracked elements and do a comprehensive cleanup
            if (dragStateRef.current.dragTarget) {
                dragStateRef.current.dragTarget.classList.remove("dragged");
            }
            if (dragStateRef.current.lastDragged) {
                dragStateRef.current.lastDragged.classList.remove(
                    "drag-over-top",
                    "drag-over-bottom",
                    "drag-over-inside"
                );
            }

            // Comprehensive cleanup: clear all drag indicators from all nodes
            const allNodes = editorRef.current?.querySelectorAll(".node");
            allNodes?.forEach((node) => {
                node.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-inside", "dragged");
            });

            dragStateRef.current.dragTarget = null;
            dragStateRef.current.lastDragged = null;
        },
        [dragReorder]
    );

    const exportToJson = useCallback(() => {
        const jsonString = JSON.stringify(nodes, null, 2);
        navigator.clipboard.writeText(jsonString);
    }, [nodes]);

    const importFromJson = useCallback(() => {
        setShowJsonImport(true);
        setJsonImportText("");
    }, []);

    const composePrompt = useCallback(() => {
        const { positive, negative } = composePromptsFromNodes(nodes, true);
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
            const encodedData = match[1];
            // Try legacy format first (LZString + keyEncodeObject)
            const legacyData = decodeLegacy(encodedData);
            if (legacyData && Array.isArray(legacyData)) {
                setNodes(legacyData);
                setModified(true);
                return true;
            }
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

    // Extract text chunks from PNG files
    const extractPNGTextChunks = (arrayBuffer: ArrayBuffer): string => {
        const dataView = new DataView(arrayBuffer);
        let offset = 8; // Skip PNG signature

        while (offset < arrayBuffer.byteLength) {
            const length = dataView.getUint32(offset, false);
            offset += 4;

            const type = String.fromCharCode(
                dataView.getUint8(offset),
                dataView.getUint8(offset + 1),
                dataView.getUint8(offset + 2),
                dataView.getUint8(offset + 3)
            );
            offset += 4;

            if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
                // Read the keyword (null-terminated)
                let keyword = "";
                let i = offset;
                while (i < offset + length && dataView.getUint8(i) !== 0) {
                    keyword += String.fromCharCode(dataView.getUint8(i));
                    i++;
                }

                // Read the text data
                const textStart = i + 1;
                let text = "";
                for (let j = textStart; j < offset + length; j++) {
                    text += String.fromCharCode(dataView.getUint8(j));
                }

                // Look for parameters or prompt data
                if (keyword === "parameters" || keyword === "prompt" || keyword.includes("prompt")) {
                    return text;
                }
            }

            offset += length + 4; // Skip data and CRC
        }
        return "";
    };

    // Extract EXIF data from JPEG files
    const extractJPEGMetadata = (arrayBuffer: ArrayBuffer): string => {
        const dataView = new DataView(arrayBuffer);
        let offset = 2; // Skip JPEG SOI marker

        while (offset < arrayBuffer.byteLength - 2) {
            const marker = dataView.getUint16(offset, false);
            offset += 2;

            if (marker === 0xffe1) {
                // APP1 marker (EXIF)
                offset += 2;

                // Check if it's EXIF data
                if (dataView.getUint32(offset, false) === 0x45786966) {
                    // "Exif"
                    offset += 6; // Skip "Exif" and null bytes

                    // Skip TIFF header
                    let tiffOffset = offset;
                    const isLittleEndian = dataView.getUint16(tiffOffset, false) === 0x4949;
                    tiffOffset += 4;

                    // Read IFD0
                    const ifd0Offset = dataView.getUint32(tiffOffset, isLittleEndian);
                    tiffOffset = offset + ifd0Offset;

                    const numEntries = dataView.getUint16(tiffOffset, isLittleEndian);
                    tiffOffset += 2;

                    for (let i = 0; i < numEntries; i++) {
                        const tag = dataView.getUint16(tiffOffset, isLittleEndian);
                        const type = dataView.getUint16(tiffOffset + 2, isLittleEndian);
                        const count = dataView.getUint32(tiffOffset + 4, isLittleEndian);
                        const valueOffset = dataView.getUint32(tiffOffset + 8, isLittleEndian);

                        if (tag === 37510) {
                            // UserComment tag
                            let commentOffset = offset + valueOffset;
                            let comment = "";

                            // Skip encoding marker (8 bytes for some software)
                            if (count > 8) {
                                commentOffset += 8;
                            }

                            for (let j = 0; j < count - 8 && commentOffset < arrayBuffer.byteLength; j++) {
                                const byte = dataView.getUint8(commentOffset++);
                                if (byte !== 0) {
                                    comment += String.fromCharCode(byte);
                                }
                            }

                            if (comment.includes("<betterpromptexport:") || comment.includes("betterpromptexport")) {
                                return comment;
                            }
                        }

                        tiffOffset += 12;
                    }
                }
            } else if (marker >= 0xffe0 && marker <= 0xffef) {
                // Other APP markers, skip them
                const length = dataView.getUint16(offset, false);
                offset += length - 2;
            } else if (marker === 0xffda) {
                // SOS marker, end of metadata
                break;
            } else {
                // Unknown marker, try to skip
                if (offset < arrayBuffer.byteLength - 2) {
                    const length = dataView.getUint16(offset, false);
                    if (length >= 2) {
                        offset += length - 2;
                    } else {
                        break;
                    }
                }
            }
        }
        return "";
    };

    const loadFromFile = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.txt,.png,.jpg,.jpeg,.webp";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const fileExtension = file.name.toLowerCase().split(".").pop();

                if (fileExtension === "png") {
                    // Handle PNG files - extract metadata
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        const metadata = extractPNGTextChunks(arrayBuffer);

                        if (metadata && loadFromPrompt(metadata)) {
                            // Successfully loaded from embedded prompt data
                            return;
                        }

                        // Fallback: try to parse metadata as JSON
                        try {
                            const data = JSON.parse(metadata);
                            if (Array.isArray(data)) {
                                setNodes(data);
                                setModified(true);
                                return;
                            }
                        } catch {
                            // Not JSON, create text node from metadata
                        }

                        // Last resort: create text node from metadata
                        const textNode: TextNode = {
                            id: generateId(),
                            type: "text",
                            name: "Imported Image Text",
                            hidden: false,
                            weight: 1,
                            value: metadata || "No metadata found in image",
                        };
                        setNodes([textNode]);
                        setModified(true);
                    };
                    reader.readAsArrayBuffer(file);
                } else if (fileExtension === "jpg" || fileExtension === "jpeg") {
                    // Handle JPEG files - extract EXIF metadata
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        const metadata = extractJPEGMetadata(arrayBuffer);

                        if (metadata && loadFromPrompt(metadata)) {
                            // Successfully loaded from embedded prompt data
                            return;
                        }

                        // Fallback: try to parse metadata as JSON
                        try {
                            const data = JSON.parse(metadata);
                            if (Array.isArray(data)) {
                                setNodes(data);
                                setModified(true);
                                return;
                            }
                        } catch {
                            // Not JSON, create text node from metadata
                        }

                        // Last resort: create text node from metadata
                        const textNode: TextNode = {
                            id: generateId(),
                            type: "text",
                            name: "Imported Image Text",
                            hidden: false,
                            weight: 1,
                            value: metadata || "No metadata found in image",
                        };
                        setNodes([textNode]);
                        setModified(true);
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    // Handle text-based files (JSON, TXT)
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;

                        // First try to load from embedded prompt data
                        if (loadFromPrompt(content)) {
                            return;
                        }

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
            }
        };
        input.click();
    }, [generateId, loadFromPrompt]);

    return (
        <div className={cn("prompt-composer", className)}>
            <div className="better-prompt-container">
                <div className="better-prompt">
                    {/* Footer */}
                    <div className="editor-footer">
                        <div className="left-side"></div>
                        <div className="right-side">
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
                            <button className={cn("compose", { modified })} onClick={composePrompt}>
                                COMPOSE
                            </button>
                        </div>
                    </div>
                    {/* Main Editor */}
                    <div
                        className="main-editor"
                        ref={editorRef}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <NodeField nodes={nodes} onChange={handleNodesChange} generateId={generateId} />
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
