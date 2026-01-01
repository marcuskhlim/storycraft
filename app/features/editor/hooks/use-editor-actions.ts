"use client";

import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { clientLogger } from "@/lib/utils/client-logger";
import { exportVideoClient } from "@/lib/utils/client-export";
import { TimelineLayer } from "@/app/types";

export function useEditorActions() {
    const { setLoading } = useLoadingStore();
    const { setExportProgress } = useEditorStore();
    const { setVideoUri, setVttUri, setErrorMessage } = useScenarioStore();

    const handleExportMovie = async (layers: TimelineLayer[]) => {
        setLoading("video", true);
        setErrorMessage(null);
        try {
            clientLogger.log("Export Movie Client Side");
            clientLogger.log(layers);

            const blob = await exportVideoClient(layers, (progress) => {
                setExportProgress(progress);
            });
            const videoUrl = URL.createObjectURL(blob);

            // Download immediately
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = `storycraft-${new Date().toISOString()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setVideoUri(videoUrl);
            setVttUri(null);
        } catch (error) {
            clientLogger.error("Error generating video:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating video",
            );
            setVttUri(null);
        } finally {
            setLoading("video", false);
        }
    };

    return {
        handleExportMovie,
    };
}
