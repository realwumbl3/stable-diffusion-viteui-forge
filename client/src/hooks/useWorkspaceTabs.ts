// VITE UI
import { useState, useEffect, useCallback } from 'react';
import type { UseWorkspaceTabsReturn } from '../types/hooks';

const STORAGE_KEY_OPEN_WORKSPACES = 'viteui-open-workspaces';
const STORAGE_KEY_CURRENT_WORKSPACE = 'viteui-current-workspace';

const loadInitialTabs = (): { openWorkspaces: string[]; currentWorkspace: string | null } => {
    if (typeof window === 'undefined') {
        return { openWorkspaces: [], currentWorkspace: null };
    }

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

        const currentWorkspaceData: string | null = storedCurrent;

        if (currentWorkspaceData && !openWorkspacesData.includes(currentWorkspaceData)) {
            openWorkspacesData = [...openWorkspacesData, currentWorkspaceData];
            localStorage.setItem(STORAGE_KEY_OPEN_WORKSPACES, JSON.stringify(openWorkspacesData));
        }

        return {
            openWorkspaces: openWorkspacesData,
            currentWorkspace: currentWorkspaceData,
        };
    } catch (error) {
        console.warn('Failed to load workspace tabs from localStorage:', error);
        return { openWorkspaces: [], currentWorkspace: null };
    }
};

/**
 * Hook for managing workspace tabs with localStorage persistence
 */
export const useWorkspaceTabs = (): UseWorkspaceTabsReturn => {
    // Initialize state with loaded tabs - use lazy initialization to avoid ref access during render
    const [openWorkspaces, setOpenWorkspaces] = useState<string[]>(() => {
        const initial = loadInitialTabs();
        return initial.openWorkspaces;
    });
    const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(() => {
        const initial = loadInitialTabs();
        return initial.currentWorkspace;
    });

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
        setOpenWorkspaces(prev => prev.filter(name => name !== workspaceName));

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
