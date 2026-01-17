import { useEffect } from "react";

export function useKeyboardShortcuts({
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    setDrawingMode,
    fillMask,
    clearMask,
    undoMask,
    redoMask,
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

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
                    fillMask();
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
    }, [brushSize, setBrushSize, brushHardness, setBrushHardness, setDrawingMode, fillMask, clearMask, undoMask, redoMask]);
}