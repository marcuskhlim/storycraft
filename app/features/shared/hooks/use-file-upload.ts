"use client";

import { useRef, useCallback } from "react";

interface UseFileUploadOptions {
    onFileSelect: (file: File) => void;
    accept?: string;
}

export function useFileUpload({
    onFileSelect,
    accept = "image/*",
}: UseFileUploadOptions) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                onFileSelect(file);
            }
            // Reset the value so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
        [onFileSelect],
    );

    return {
        fileInputRef,
        handleUploadClick,
        handleFileChange,
        accept,
    };
}
