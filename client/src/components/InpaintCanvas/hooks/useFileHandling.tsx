import { useState, useRef, useCallback } from "react";

export function useFileHandling({ onImageUpload }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
        (file) => {
            if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (onImageUpload && e.target) {
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

    const handleFileInput = useCallback((e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    }, [handleFileSelect]);

    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
        },
        []
    );

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e) => {
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

    return {
        isDragOver,
        fileInputRef,
        handleFileInput,
        handleFileSelect,
        openFileDialog,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}