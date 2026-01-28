import { useState, useRef, useCallback, useMemo } from "react";

export function useFileHandling({ onImageUpload }: { onImageUpload?: (dataUrl: string) => void }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
        (file: File) => {
            if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (onImageUpload && e.target && typeof e.target.result === 'string') {
                        onImageUpload(e.target.result);
                        // Clear any existing mask when uploading a new image
                        // This will be handled by the parent component
                    }
                };
                reader.readAsDataURL(file);
            }
        },
        [onImageUpload]
    );

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
        },
        []
    );

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    return useMemo(() => ({
        isDragOver,
        fileInputRef,
        handleFileInput,
        handleFileSelect,
        openFileDialog,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    }), [
        isDragOver,
        fileInputRef,
        handleFileInput,
        handleFileSelect,
        openFileDialog,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    ]);
}