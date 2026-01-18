import { useEffect, useState } from "react";
import { Folder, FolderPlus, ChevronRight, ChevronDown } from "lucide-react";
import api from "../Api";

const WorkspaceBrowser = ({ currentWorkspace, onSelectWorkspace, onClose }) => {
    const [structure, setStructure] = useState(null);
    const [expanded, setExpanded] = useState(new Set());
    const [newFolderName, setNewFolderName] = useState("");

    useEffect(() => {
        loadStructure();
    }, []);

    const loadStructure = async () => {
        try {
            const data = await api.getWorkspaceStructure();
            setStructure(data.structure);
            setExpanded(new Set([data.structure?.path || "workspaces"]));
        } catch (error) {
            console.error("Failed to load workspace structure:", error);
        }
    };

    const toggleExpanded = (path) => {
        const next = new Set(expanded);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        setExpanded(next);
    };

    const createFolder = async () => {
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

    const renderNode = (node) => {
        if (!node) return null;
        const isExpanded = expanded.has(node.path);
        const hasChildren = node.children?.length > 0;
        const isWorkspace = node.type === "workspace";
        const isActive = currentWorkspace && node.path === currentWorkspace;

        return (
            <div key={node.path}>
                <div
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                        isActive ? "bg-studio-surface text-studio-accent" : "hover:bg-studio-surface"
                    }`}
                    onClick={() => {
                        if (hasChildren) {
                            toggleExpanded(node.path);
                        }
                        if (isWorkspace) {
                            onSelectWorkspace?.(node.path);
                        }
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    ) : (
                        <span className="w-4 h-4" />
                    )}
                    <Folder className="w-4 h-4" />
                    <span className="text-sm">{node.name}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="ml-4">
                        {node.children.map((child) => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-studio-panel border border-studio-border rounded-lg w-[420px] max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-studio-border flex items-center justify-between">
                    <h3 className="font-medium">Workspaces</h3>
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
                        placeholder="Create folder..."
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
