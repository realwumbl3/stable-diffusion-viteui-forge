// VITE UI
import { useState, useEffect, useRef } from "react";
import { X, Plus, FolderOpen } from "lucide-react";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";
import type { WorkspaceTabsProps } from "../types/components";

/**
 * WorkspaceTabs component for managing multiple open workspaces with tabs
 */
const WorkspaceTabs = ({
    openWorkspaces = [],
    currentWorkspace,
    onWorkspaceChange,
    onWorkspaceClose,
    onOpenWorkspaceBrowser,
    onCreateWorkspace
}: WorkspaceTabsProps) => {
    const tabsRef = useRef<HTMLDivElement>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Scroll active tab into view
    useEffect(() => {
        if (tabsRef.current && currentWorkspace && openWorkspaces.includes(currentWorkspace)) {
            const activeTab = tabsRef.current.querySelector(`[data-workspace="${currentWorkspace}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [currentWorkspace, openWorkspaces]);

    const handleTabClick = (workspaceName: string, e: React.MouseEvent): void => {
        e.preventDefault();
        onWorkspaceChange?.(workspaceName);
    };

    const handleTabClose = (workspaceName: string, e: React.MouseEvent): void => {
        e.stopPropagation();
        onWorkspaceClose?.(workspaceName);
    };

    return (
        <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* Tabs container */}
            <div
                ref={tabsRef}
                className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide"
            >
                {openWorkspaces?.map((workspace) => (
                    <div
                        key={workspace}
                        data-workspace={workspace}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t border-l border-r cursor-pointer transition-colors whitespace-nowrap min-w-0 max-w-48 ${
                            currentWorkspace === workspace
                                ? "bg-studio-panel border-studio-border text-studio-text"
                                : "bg-studio-surface/50 border-transparent text-studio-textSecondary hover:bg-studio-surface hover:text-studio-text"
                        }`}
                        onClick={(e) => handleTabClick(workspace, e)}
                    >
                        <span className="text-sm truncate flex-1">{workspace}</span>
                        <button
                            onClick={(e) => handleTabClose(workspace, e)}
                            className="ml-1 p-0.5 hover:bg-studio-surface rounded opacity-60 hover:opacity-100 transition-opacity"
                            title={`Close ${workspace}`}
                            type="button"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-2">
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="p-1.5 hover:bg-studio-surface rounded transition-colors"
                    title="Create New Workspace"
                    type="button"
                >
                    <Plus className="w-4 h-4 text-studio-textSecondary" />
                </button>
                <button
                    onClick={() => onOpenWorkspaceBrowser?.()}
                    className="p-1.5 hover:bg-studio-surface rounded transition-colors"
                    title="Open Workspace Browser"
                    type="button"
                >
                    <FolderOpen className="w-4 h-4 text-studio-textSecondary" />
                </button>
            </div>

            {/* Create Workspace Dialog */}
            <CreateWorkspaceDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreateWorkspace={onCreateWorkspace}
            />
        </div>
    );
};

export default WorkspaceTabs;
