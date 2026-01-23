// VITE UI
import { useEffect, useState } from "react";
import { Folder, FolderPlus, ChevronRight, ChevronDown, Briefcase } from "lucide-react";
import api from "../Api";
import type { WorkspaceBrowserProps, WorkspaceStructureNode } from "../types/components";

/**
 * WorkspaceBrowser component for managing workspace structure
 * Features: drag & drop, renaming, folder creation, workspace selection
 */
const WorkspaceBrowser = ({ currentWorkspace, onSelectWorkspace, onClose }: WorkspaceBrowserProps) => {
    // Component state
    const [structure, setStructure] = useState<WorkspaceStructureNode | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [newFolderName, setNewFolderName] = useState<string>("");

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState<WorkspaceStructureNode | null>(null);
    const [dragOverItem, setDragOverItem] = useState<WorkspaceStructureNode | null>(null);

    // Rename state
    const [renamingItem, setRenamingItem] = useState<WorkspaceStructureNode | null>(null);
    const [renameValue, setRenameValue] = useState<string>("");

    // Click handling state
    const [clickTimeout, setClickTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        loadStructure();
    }, []);

    useEffect(() => {
        return () => {
            if (clickTimeout) clearTimeout(clickTimeout);
        };
    }, [clickTimeout]);

    // Data loading
    const loadStructure = async (): Promise<void> => {
        try {
            const data = await api.getWorkspaceStructure();
            setStructure(data.structure);
            setExpanded(new Set([data.structure?.path || "workspaces"]));
        } catch (error) {
            console.error("Failed to load workspace structure:", error);
        }
    };

    // Tree expansion
    const toggleExpanded = (path: string): void => {
        const next = new Set(expanded);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        setExpanded(next);
    };

    // Folder creation
    const createFolder = async (): Promise<void> => {
        const trimmed = newFolderName.trim();
        if (!trimmed) return;
        try {
            await api.createWorkspaceFolder(trimmed);
            setNewFolderName("");
            await loadStructure();
        } catch (error) {
            console.error("Failed to create folder:", error);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, node: WorkspaceStructureNode): void => {
        // Don't allow dragging the root "workspaces" node
        if (node.path === "workspaces") {
            e.preventDefault();
            return;
        }
        setDraggedItem(node);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", node.path);
    };

    const handleDragEnd = (): void => {
        setDraggedItem(null);
        setDragOverItem(null);
    };

    const handleDragOver = (e: React.DragEvent, node: WorkspaceStructureNode): void => {
        e.preventDefault();

        // Only allow dropping on folders, not workspaces
        if (node.type === "workspace") {
            setDragOverItem(null);
            return;
        }

        // Don't allow dropping on the dragged item itself or its children
        if (draggedItem && (node.path === draggedItem.path || node.path.startsWith(draggedItem.path + "/"))) {
            setDragOverItem(null);
            return;
        }

        setDragOverItem(node);
        e.dataTransfer.dropEffect = "move";
    };

    const handleDragLeave = (): void => {
        setDragOverItem(null);
    };

    const handleDrop = async (e: React.DragEvent, node: WorkspaceStructureNode): Promise<void> => {
        e.preventDefault();
        setDragOverItem(null);

        if (!draggedItem || draggedItem.path === node.path || node.type === "workspace") {
            return;
        }

        // Don't allow dropping on self or children
        if (node.path.startsWith(draggedItem.path + "/")) {
            return;
        }

        const destinationPath = node.path === "workspaces" ? draggedItem.name : `${node.path}/${draggedItem.name}`;

        try {
            await api.moveWorkspaceItem(draggedItem.path, destinationPath);
            setDraggedItem(null);
            await loadStructure();
        } catch (error) {
            console.error("Failed to move item:", error);
            // Could show a toast notification here
        }
    };

    // Rename functionality
    const startRename = (node: WorkspaceStructureNode): void => {
        // Don't allow renaming the root "workspaces" node
        if (node.path === "workspaces") return;
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            setClickTimeout(null);
        }
        setRenamingItem(node);
        setRenameValue(node.name);
    };

    const handleClick = (node: WorkspaceStructureNode): void => {
        if (renamingItem) return;

        const isWorkspace = node.type === "workspace";
        const hasChildren = node.children?.length > 0;

        // Double-click detection using timeout
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            setClickTimeout(null);
            startRename(node);
            return;
        }

        const timeout = setTimeout(() => {
            setClickTimeout(null);
            // Single-click: expand folder or select workspace
            if (hasChildren && !isWorkspace) {
                toggleExpanded(node.path);
            } else if (isWorkspace) {
                onSelectWorkspace?.(node.path);
            }
        }, 250);

        setClickTimeout(timeout);
    };

    const cancelRename = (): void => {
        setRenamingItem(null);
        setRenameValue("");
    };

    const confirmRename = async (): Promise<void> => {
        const trimmedName = renameValue.trim();
        if (!renamingItem || !trimmedName || trimmedName === renamingItem.name) {
            cancelRename();
            return;
        }

        try {
            await api.renameWorkspaceItem(renamingItem.path, trimmedName);
            cancelRename();
            await loadStructure();
        } catch (error) {
            console.error("Failed to rename item:", error);
        }
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Enter") confirmRename();
        else if (e.key === "Escape") cancelRename();
    };


    // Helper functions for cleaner code
    const getNodeClasses = (node: WorkspaceStructureNode): string => {
        const isActive = currentWorkspace && node.path === currentWorkspace;
        const isDraggedOver = dragOverItem?.path === node.path;
        const isBeingDragged = draggedItem?.path === node.path;

        const baseClasses = "flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors";
        const stateClasses = isActive
            ? "bg-studio-surface text-studio-accent"
            : isDraggedOver
                ? "bg-studio-accent/20 border border-studio-accent"
                : "hover:bg-studio-surface";

        return `${baseClasses} ${stateClasses} ${isBeingDragged ? "opacity-50" : ""}`;
    };

    const renderExpandIcon = (hasChildren: boolean, isWorkspace: boolean, isExpanded: boolean): React.ReactNode => {
        if (!hasChildren || isWorkspace) return <span className="w-4 h-4" />;
        return isExpanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />;
    };

    const renderIcon = (isWorkspace: boolean): React.ReactNode => {
        return isWorkspace
            ? <Briefcase className="w-4 h-4 text-studio-accent" />
            : <Folder className="w-4 h-4 text-studio-textSecondary" />;
    };

    const renderName = (node: WorkspaceStructureNode): React.ReactNode => {
        const isRenaming = renamingItem?.path === node.path;

        if (isRenaming) {
            return (
                <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={confirmRename}
                    className="flex-1 bg-studio-surface border border-studio-accent rounded px-1 text-sm outline-none"
                    autoFocus
                />
            );
        }

        return <span className="text-sm">{node.name}</span>;
    };

    const renderChildren = (node: WorkspaceStructureNode, hasChildren: boolean, isWorkspace: boolean, isExpanded: boolean): React.ReactNode => {
        if (!hasChildren || isWorkspace || !isExpanded) return null;

        return (
            <div className="ml-4">
                {node.children.map((child) => renderNode(child))}
            </div>
        );
    };

    const renderNode = (node: WorkspaceStructureNode | null): React.ReactNode => {
        if (!node) return null;

        const isExpanded = expanded.has(node.path);
        const hasChildren = node.children?.length > 0;
        const isWorkspace = node.type === "workspace";

        return (
            <div key={node.path}>
                <div
                    className={getNodeClasses(node)}
                    draggable={node.path !== "workspaces" && !renamingItem}
                    onDragStart={(e) => handleDragStart(e, node)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, node)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, node)}
                    onClick={() => handleClick(node)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        startRename(node);
                    }}
                >
                    {renderExpandIcon(hasChildren, isWorkspace, isExpanded)}
                    {renderIcon(isWorkspace)}
                    {renderName(node)}
                </div>
                {renderChildren(node, hasChildren, isWorkspace, isExpanded)}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-studio-panel border border-studio-border rounded-lg w-[420px] max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-studio-border flex items-center justify-between">
                    <h3 className="font-medium">Workspace Browser</h3>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 bg-studio-surface text-studio-textSecondary rounded text-sm"
                        type="button"
                    >
                        Close
                    </button>
                </div>
                <div className="p-4 border-b border-studio-border flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Create workspace folder..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-studio-surface border border-studio-border rounded text-sm"
                        onKeyDown={(e) => e.key === "Enter" && createFolder()}
                    />
                    <button
                        onClick={createFolder}
                        className="p-2 bg-studio-surface rounded hover:bg-studio-border"
                        title="Create folder"
                        type="button"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {structure ? renderNode(structure) : <div className="text-center py-6 text-sm">Loading...</div>}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceBrowser;
