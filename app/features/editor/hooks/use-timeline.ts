import { useCallback, useRef } from "react";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import type { TimelineLayer } from "@/app/types";
import { ApiResponse } from "@/types/api";
import { clientLogger } from "@/lib/utils/client-logger";
import {
    useSaveTimelineMutation,
    useResetTimelineMutation,
    TIMELINE_KEYS,
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
                // Try to get from cache first
                const cachedData = queryClient.getQueryData<TimelineLayer[]>(
                    TIMELINE_KEYS.detail(scenarioId),
                );
                if (cachedData) {
                    return cachedData;
                }

                const response = await fetch(
                    `/api/timeline?scenarioId=${scenarioId}`,
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error("Failed to load timeline");
                }

                const result = (await response.json()) as ApiResponse<{
                    timeline: { layers: TimelineLayer[] } | null;
                }>;
                const layers = result.data?.timeline?.layers || null;

                // Seed the cache
                if (layers) {
                    queryClient.setQueryData(
                        TIMELINE_KEYS.detail(scenarioId),
                        layers,
                    );
                }

                return layers;
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
