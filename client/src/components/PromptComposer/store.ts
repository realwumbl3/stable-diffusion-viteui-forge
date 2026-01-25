import React from "react";
import type { PromptNode } from "./types";

// Simple store implementation using module-level state
class PromptComposerStore {
  private nodes: PromptNode[] = [];
  private listeners: Set<(nodes: PromptNode[]) => void> = new Set();
  private nodesSerialized = "";

  getNodes(): PromptNode[] {
    return [...this.nodes];
  }

  setNodes(nodes: PromptNode[]): void {
    const nextSerialized = JSON.stringify(nodes);
    if (nextSerialized === this.nodesSerialized) {
      return;
    }
    this.nodes = [...nodes];
    this.nodesSerialized = nextSerialized;
    this.notifyListeners();
  }

  subscribe(listener: (nodes: PromptNode[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.nodes]));
  }

  // Initialize with initial data if provided
  initialize(initialData?: PromptNode[]): void {
    if (initialData && initialData.length > 0 && this.nodes.length === 0) {
      this.nodes = [...initialData];
      this.nodesSerialized = JSON.stringify(this.nodes);
    }
  }
}

// Singleton instance
const store = new PromptComposerStore();

// React hook to use the store
export const usePromptComposerStore = (initialData?: PromptNode[]) => {
  const [nodes, setNodes] = React.useState<PromptNode[]>(() => {
    store.initialize(initialData);
    return store.getNodes();
  });

  React.useEffect(() => {
    const unsubscribe = store.subscribe(setNodes);
    return unsubscribe;
  }, []);

  const updateNodes = React.useCallback((newNodes: PromptNode[]) => {
    store.setNodes(newNodes);
  }, []);

  return {
    nodes,
    setNodes: updateNodes,
  };
};

// Export store instance for direct access if needed
export { store };