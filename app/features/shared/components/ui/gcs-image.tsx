"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { memo } from "react";
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
            clientLogger.info("gcsUri ",gcsUri);
            if (!gcsUri) {
                return null;
            }
            if (!gcsUri.startsWith("gs://")) {
                clientLogger.error("Invalid GCS URI format:", gcsUri);
                return null;
            }
            try {
                const response = await fetch(
                    //`/api/media?uri=${encodeURIComponent(gcsUri)}`,
                    `/api/media?uri=${gcsUri}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch image URL: ${response.status}`,
                    );
                }
                const result = await response.json();
                return result;
            } catch (error) {
                clientLogger.error("Error fetching image URL:", error);
                throw error;
            }
        },
        enabled: !!gcsUri,
        staleTime: 60 * 1000 * 15,
    });

    const imageUrl = imageData?.url || null;

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
