import { useState } from "react";
import { Folder, Plus, FolderOpen } from "lucide-react";
import OptionPicker from "./OptionPicker.jsx";

const WorkspacePicker = ({ currentWorkspace, workspaces, onWorkspaceChange, onCreateWorkspace, onOpenWorkspace }) => {
    const [showCreate, setShowCreate] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");

    const createWorkspace = async () => {
        const name = newWorkspaceName.trim();
        if (!name) return;
        try {
            await onCreateWorkspace(name);
            setShowCreate(false);
            setNewWorkspaceName("");
        } catch (error) {
            console.error("Failed to create workspace:", error);
        }
    };

    return (
        <div className="relative flex items-center gap-2">
            <Folder className="w-4 h-4 text-studio-textSecondary" />
            <OptionPicker
                options={workspaces.map((workspace) => ({
                    value: workspace.name,
                    label: workspace.name
                }))}
                value={currentWorkspace || ""}
                onChange={(value) => onWorkspaceChange?.(value)}
                placeholder="Select workspace..."
                title="Workspace"
            />
            <button
                onClick={() => setShowCreate(true)}
                className="p-1 hover:bg-studio-surface rounded"
                title="New Workspace"
                type="button"
            >
                <Plus className="w-4 h-4" />
            </button>
            <button
                onClick={onOpenWorkspace}
                className="p-1 hover:bg-studio-surface rounded"
                title="Open Workspace"
                type="button"
            >
                <FolderOpen className="w-4 h-4" />
            </button>

            {showCreate && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-studio-panel border border-studio-border rounded p-3 shadow-lg z-20">
                    <input
                        type="text"
                        placeholder="Workspace name"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        className="w-full px-2 py-1 bg-studio-surface border border-studio-border rounded mb-2"
                        onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={createWorkspace}
                            className="px-3 py-1 bg-studio-accent text-white rounded text-sm"
                            type="button"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="px-3 py-1 bg-studio-surface text-studio-textSecondary rounded text-sm"
                            type="button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspacePicker;
