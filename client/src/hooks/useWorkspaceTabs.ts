// VITE UI
import { useState, useEffect, useCallback } from 'react';
import type { UseWorkspaceTabsReturn } from '../types/hooks';

const STORAGE_KEY_OPEN_WORKSPACES = 'viteui-open-workspaces';
const STORAGE_KEY_CURRENT_WORKSPACE = 'viteui-current-workspace';

/**
 * Hook for managing workspace tabs with localStorage persistence
 */
export const useWorkspaceTabs = (): UseWorkspaceTabsReturn => {
    const [openWorkspaces, setOpenWorkspaces] = useState<string[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const storedOpen = localStorage.getItem(STORAGE_KEY_OPEN_WORKSPACES);
            const storedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT_WORKSPACE);

            let openWorkspacesData: string[] = [];
            if (storedOpen) {
                const parsed = JSON.parse(storedOpen);
                if (Array.isArray(parsed)) {
                    openWorkspacesData = parsed;
                }
            }

            // If we have a current workspace but it's not in open workspaces, add it
            if (storedCurrent && !openWorkspacesData.includes(storedCurrent)) {
                openWorkspacesData = [...openWorkspacesData, storedCurrent];
                // Update localStorage to fix the inconsistency
                localStorage.setItem(STORAGE_KEY_OPEN_WORKSPACES, JSON.stringify(openWorkspacesData));
            }

            setOpenWorkspaces(openWorkspacesData);

            if (storedCurrent) {
                setCurrentWorkspace(storedCurrent);
            }
        } catch (error) {
            console.warn('Failed to load workspace tabs from localStorage:', error);
        }
    }, []);

    // Save to localStorage whenever state changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_OPEN_WORKSPACES, JSON.stringify(openWorkspaces));
        } catch (error) {
            console.warn('Failed to save open workspaces to localStorage:', error);
        }
    }, [openWorkspaces]);

    useEffect(() => {
        try {
            if (currentWorkspace) {
                localStorage.setItem(STORAGE_KEY_CURRENT_WORKSPACE, currentWorkspace);
            } else {
                localStorage.removeItem(STORAGE_KEY_CURRENT_WORKSPACE);
            }
        } catch (error) {
            console.warn('Failed to save current workspace to localStorage:', error);
        }
    }, [currentWorkspace]);

    const openWorkspace = useCallback((workspaceName: string) => {
        setOpenWorkspaces(prev => {
            if (!prev.includes(workspaceName)) {
                return [...prev, workspaceName];
            }
            return prev;
        });
        setCurrentWorkspace(workspaceName);
    }, []);

    const closeWorkspace = useCallback((workspaceName: string) => {
        setOpenWorkspaces(prev => {
            const filtered = prev.filter(name => name !== workspaceName);
            return filtered;
        });

        // If closing the current workspace, switch to another one
        setCurrentWorkspace(prev => {
            if (prev === workspaceName) {
                const remaining = openWorkspaces.filter(name => name !== workspaceName);
                return remaining.length > 0 ? remaining[remaining.length - 1] : null;
            }
            return prev;
        });
    }, [openWorkspaces]);

    const switchWorkspace = useCallback((workspaceName: string) => {
        if (openWorkspaces.includes(workspaceName)) {
            setCurrentWorkspace(workspaceName);
        }
    }, [openWorkspaces]);

    const closeAllWorkspaces = useCallback(() => {
        setOpenWorkspaces([]);
        setCurrentWorkspace(null);
    }, []);

    return {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces
    };
};
