import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimelineLayer } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";

export const TIMELINE_KEYS = {
    all: ["timeline"] as const,
    detail: (scenarioId: string) => [...TIMELINE_KEYS.all, scenarioId] as const,
};

export function useTimelineQuery(scenarioId: string) {
    return useQuery({
        queryKey: TIMELINE_KEYS.detail(scenarioId),
        queryFn: async () => {
            if (!scenarioId) return null;
            const response = await fetch(
                `/api/timeline?scenarioId=${scenarioId}`,
            );

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error("Failed to load timeline");
            }

            const { timeline } = await response.json();
            return (timeline?.layers as TimelineLayer[]) || null;
        },
        enabled: !!scenarioId,
    });
}

export function useSaveTimelineMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            scenarioId,
            layers,
        }: {
            scenarioId: string;
            layers: TimelineLayer[];
        }) => {
            const response = await fetch("/api/timeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scenarioId, layers }),
            });

            if (!response.ok) {
                throw new Error("Failed to save timeline");
            }

            return await response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: TIMELINE_KEYS.detail(variables.scenarioId),
            });
        },
        onError: (error) => {
            clientLogger.error("Error saving timeline:", error);
        },
    });
}

export function useResetTimelineMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (scenarioId: string) => {
            const response = await fetch(
                `/api/timeline?scenarioId=${scenarioId}`,
                {
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                throw new Error("Failed to reset timeline");
            }

            return await response.json();
        },
        onSuccess: (_, scenarioId) => {
            queryClient.invalidateQueries({
                queryKey: TIMELINE_KEYS.detail(scenarioId),
            });
        },
        onError: (error) => {
            clientLogger.error("Error resetting timeline:", error);
        },
    });
}
