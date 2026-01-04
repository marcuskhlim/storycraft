import { useCallback, useRef } from "react";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import type { TimelineLayer } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";
import {
    useSaveTimelineMutation,
    useResetTimelineMutation,
    TIMELINE_KEYS,
    fetchTimeline,
} from "./use-timeline-query";
import { useQueryClient } from "@tanstack/react-query";

export function useTimeline() {
    const { session } = useAuth();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const queryClient = useQueryClient();

    const saveMutation = useSaveTimelineMutation();
    const resetMutation = useResetTimelineMutation();

    const saveTimeline = useCallback(
        async (scenarioId: string, layers: TimelineLayer[]) => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot save timeline: user not authenticated",
                );
                return null;
            }

            try {
                const result = await saveMutation.mutateAsync({
                    scenarioId,
                    layers,
                });
                return result?.timelineId || null;
            } catch (error) {
                // Error is already logged in the mutation hook
                throw error;
            }
        },
        [session?.user?.id, saveMutation],
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
                return await queryClient.fetchQuery({
                    queryKey: TIMELINE_KEYS.detail(scenarioId),
                    queryFn: () => fetchTimeline(scenarioId),
                });
            } catch (error) {
                clientLogger.error("Error loading timeline:", error);
                return null;
            }
        },
        [session?.user?.id, queryClient],
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
                await resetMutation.mutateAsync(scenarioId);
            } catch (error) {
                // Error is already logged in the mutation hook
                throw error;
            }
        },
        [session?.user?.id, resetMutation],
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
        isSaving: saveMutation.isPending,
    };
}
