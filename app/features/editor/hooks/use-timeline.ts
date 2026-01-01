import { useCallback, useRef } from "react";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import type { TimelineLayer } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";

export function useTimeline() {
    const { session } = useAuth();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const saveTimeline = useCallback(
        async (scenarioId: string, layers: TimelineLayer[]) => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot save timeline: user not authenticated",
                );
                return null;
            }

            try {
                const response = await fetch("/api/timeline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scenarioId, layers }),
                });

                if (!response.ok) {
                    throw new Error("Failed to save timeline");
                }

                const result = await response.json();
                return result.timelineId;
            } catch (error) {
                clientLogger.error("Error saving timeline:", error);
                throw error;
            }
        },
        [session?.user?.id],
    );

    const saveTimelineDebounced = useCallback(
        (scenarioId: string, layers: TimelineLayer[]) => {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for debounced save
            saveTimeoutRef.current = setTimeout(() => {
                saveTimeline(scenarioId, layers).catch((error) => {
                    clientLogger.error(
                        "Debounced timeline save failed:",
                        error,
                    );
                });
            }, 1000); // Wait 1 second after last change before saving
        },
        [saveTimeline],
    );

    const loadTimeline = useCallback(
        async (scenarioId: string): Promise<TimelineLayer[] | null> => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot load timeline: user not authenticated",
                );
                return null;
            }

            try {
                const response = await fetch(
                    `/api/timeline?scenarioId=${scenarioId}`,
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error("Failed to load timeline");
                }

                const { timeline } = await response.json();
                return timeline?.layers || null;
            } catch (error) {
                clientLogger.error("Error loading timeline:", error);
                return null;
            }
        },
        [session?.user?.id],
    );

    const resetTimeline = useCallback(
        async (scenarioId: string) => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot reset timeline: user not authenticated",
                );
                return;
            }

            try {
                const response = await fetch(
                    `/api/timeline?scenarioId=${scenarioId}`,
                    {
                        method: "DELETE",
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to reset timeline");
                }
            } catch (error) {
                clientLogger.error("Error resetting timeline:", error);
                throw error;
            }
        },
        [session?.user?.id],
    );

    // Cancel any pending debounced save
    const cancelPendingSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    }, []);

    return {
        saveTimeline,
        saveTimelineDebounced,
        loadTimeline,
        resetTimeline,
        cancelPendingSave,
        isAuthenticated: !!session?.user?.id,
    };
}
