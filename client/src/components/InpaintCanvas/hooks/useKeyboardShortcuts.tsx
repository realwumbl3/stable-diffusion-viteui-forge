import { useEffect } from "react";

interface UseKeyboardShortcutsParams {
    brushSize: number;
    setBrushSize: React.Dispatch<React.SetStateAction<number>>;
    brushHardness: number;
    setBrushHardness: React.Dispatch<React.SetStateAction<number>>;
    setDrawingMode: React.Dispatch<React.SetStateAction<string>>;
    clearMask: () => void;
    undoMask: () => void;
    redoMask: () => void;
}

export function useKeyboardShortcuts({
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    setDrawingMode,
    clearMask,
    undoMask,
    redoMask,
}: UseKeyboardShortcutsParams) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when text inputs or textareas are focused
            const activeElement = document.activeElement
            if (activeElement && (
                activeElement instanceof HTMLTextAreaElement ||
                activeElement.hasAttribute('contenteditable') ||
                activeElement.tagName === 'TEXTAREA' ||
                (activeElement instanceof HTMLInputElement &&
                 (activeElement.type === 'text' || activeElement.type === 'password' || activeElement.type === 'email' ||
                  activeElement.type === 'url' || activeElement.type === 'search' || activeElement.type === 'tel'))
            )) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case "z":
                        if (e.shiftKey) {
                            e.preventDefault();
                            redoMask();
                        } else {
                            e.preventDefault();
                            undoMask();
                        }
                        break;
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case "b":
                    setDrawingMode("brush");
                    break;
                case "e":
                    setDrawingMode("erase");
                    break;
                case "f":
                    setDrawingMode("fill");
                    break;
                case "c":
                    clearMask();
                    break;
                case "[":
                    setBrushSize(Math.max(4, brushSize - 4));
                    break;
                case "]":
                    setBrushSize(brushSize + 4);
                    break;
                case "o":
                    setBrushHardness(Math.max(0.1, brushHardness - 0.1));
                    break;
                case "p":
                    setBrushHardness(Math.min(1.0, brushHardness + 0.1));
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [brushSize, setBrushSize, brushHardness, setBrushHardness, setDrawingMode, clearMask, undoMask, redoMask]);
}