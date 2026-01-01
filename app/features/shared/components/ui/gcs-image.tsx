"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { getDynamicImageUrl } from "@/app/features/shared/actions/upload-to-gcs";
import { useEffect, memo } from "react";
import { clientLogger } from "@/lib/utils/client-logger";
import { Skeleton } from "@/components/ui/skeleton";

interface GcsImageProps {
    gcsUri: string | null;
    alt: string;
    className?: string;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
}

const isDevelopment = process.env.NODE_ENV === "development";

export const GcsImage = memo(function GcsImage({
    gcsUri,
    alt,
    className,
    fill = true,
    sizes,
    priority = false,
}: GcsImageProps) {
    const { data: imageData, isLoading } = useQuery({
        queryKey: ["image", gcsUri],
        queryFn: async () => {
            if (!gcsUri) {
                return null;
            }
            if (!gcsUri.startsWith("gs://")) {
                clientLogger.error("Invalid GCS URI format:", gcsUri);
                return null;
            }
            try {
                const result = await getDynamicImageUrl(gcsUri);
                return result;
            } catch (error) {
                clientLogger.error("Error fetching image URL:", error);
                throw error;
            }
        },
        enabled: !!gcsUri,
        staleTime: isDevelopment ? 0 : 60 * 1000 * 50, // 50 minutes in production
    });

    const imageUrl = imageData?.url || null;

    // Preload the image when we have the URL
    useEffect(() => {
        if (imageUrl) {
            const img = new window.Image();
            img.src = imageUrl;
        }
    }, [imageUrl]);

    if (isLoading) {
        return (
            <div
                className={`relative h-full w-full overflow-hidden ${className}`}
            >
                <Skeleton className="absolute inset-0 h-full w-full" />
            </div>
        );
    }

    if (!imageUrl) {
        return (
            <div
                className={`relative h-full w-full overflow-hidden bg-muted ${className}`}
            >
                <Image
                    src="/placeholder.svg"
                    alt={alt}
                    className={className}
                    fill={fill}
                    sizes={sizes}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                        target.onerror = null; // Prevent infinite loop
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className={`relative h-full w-full overflow-hidden bg-black ${className}`}
        >
            <Image
                src={imageUrl}
                alt={alt}
                className={className}
                fill={fill}
                sizes={sizes}
                priority={priority}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                    target.onerror = null; // Prevent infinite loop
                }}
            />
        </div>
    );
});
