"use client";

import { resizeImage } from "@/app/features/storyboard/actions/resize-image";
import { clientLogger } from "@/lib/utils/client-logger";

/**
 * Hook for handling image uploads.
 * Reads a file, converts it to base64, and calls the resizeImage server action.
 */
export function useImageUpload() {
    const uploadImageFile = async (
        file: File,
        width?: number,
        height?: number,
    ): Promise<string> => {
        try {
            const base64String = await new Promise<string>(
                (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () =>
                        reject(new Error("Failed to read the image file"));
                    reader.readAsDataURL(file);
                },
            );

            const imageBase64 = base64String.split(",")[1];
            const resizedImageGcsUri = await resizeImage(
                imageBase64,
                width,
                height,
            );

            return resizedImageGcsUri;
        } catch (error) {
            clientLogger.error("Error in useImageUpload:", error);
            throw error;
        }
    };

    return {
        uploadImageFile,
    };
}
