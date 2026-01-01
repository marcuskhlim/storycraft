"use client";

import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDynamicImageUrl } from "@/app/actions/upload-to-gcs";
import { Loader2 } from "lucide-react";

interface VideoPlayerProps {
    videoGcsUri: string | null;
    vttSrc?: string | null;
    language?: { name: string; code: string };
    aspectRatio?: string;
}

export function VideoPlayer({
    videoGcsUri,
    vttSrc,
    language,
    aspectRatio = "16:9",
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const { data: videoData, isLoading } = useQuery({
        queryKey: ["video", videoGcsUri],
        queryFn: async () => {
            if (!videoGcsUri) {
                return null;
            }
            if (!videoGcsUri.startsWith("gs://")) {
                console.error("Invalid GCS URI format:", videoGcsUri);
                return null;
            }
            try {
                const result = await getDynamicImageUrl(videoGcsUri);
                return result;
            } catch (error) {
                console.error("Error fetching video URL:", error);
                throw error;
            }
        },
        enabled: !!videoGcsUri,
    });

    const videoUrl = videoData?.url || null;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [videoUrl, vttSrc]);

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-3xl">
                <div
                    className={`relative flex w-full items-center justify-center rounded-lg bg-black shadow-lg ${
                        aspectRatio === "9:16"
                            ? "aspect-[9/16]"
                            : "aspect-video"
                    }`}
                >
                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                </div>
            </div>
        );
    }

    if (!videoUrl) {
        return (
            <div className="mx-auto w-full max-w-3xl">
                <div
                    className={`relative flex w-full items-center justify-center rounded-lg bg-black shadow-lg ${
                        aspectRatio === "9:16"
                            ? "aspect-[9/16]"
                            : "aspect-video"
                    }`}
                >
                    <p className="text-gray-300">Video not available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-3xl">
            <video
                ref={videoRef}
                controls
                className={`w-full rounded-lg bg-black object-contain shadow-lg ${
                    aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"
                }`}
            >
                <source src={videoUrl} type="video/mp4" />
                {vttSrc && (
                    <track
                        src={vttSrc}
                        kind="subtitles"
                        srcLang={language?.code}
                        label={language?.name}
                        default
                    />
                )}
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
