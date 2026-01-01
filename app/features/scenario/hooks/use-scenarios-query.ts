import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Scenario } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";

export const SCENARIO_KEYS = {
    all: ["scenarios"] as const,
    lists: () => [...SCENARIO_KEYS.all, "list"] as const,
    details: () => [...SCENARIO_KEYS.all, "detail"] as const,
    detail: (id: string) => [...SCENARIO_KEYS.details(), id] as const,
};

export type ScenarioWithId = Scenario & {
    id: string;
    updatedAt?: unknown;
    createdAt?: unknown;
};

export function useScenarios() {
    return useQuery({
        queryKey: SCENARIO_KEYS.lists(),
        queryFn: async () => {
            const response = await fetch("/api/scenarios");
            if (!response.ok) {
                throw new Error("Failed to fetch scenarios");
            }
            const result = await response.json();
            return (result.scenarios as ScenarioWithId[]) || [];
        },
    });
}

export function useScenarioById(id: string | null) {
    return useQuery({
        queryKey: SCENARIO_KEYS.detail(id || ""),
        queryFn: async () => {
            if (!id) return null;
            const response = await fetch(`/api/scenarios?id=${id}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error("Failed to fetch scenario");
            }
            return (await response.json()) as ScenarioWithId;
        },
        enabled: !!id,
    });
}

export function useSaveScenarioMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            scenario,
            scenarioId,
        }: {
            scenario: Scenario;
            scenarioId?: string | null;
        }) => {
            const response = await fetch("/api/scenarios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    scenario,
                    scenarioId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save scenario");
            }

            return (await response.json()) as {
                success: boolean;
                scenarioId: string;
            };
        },
        onSuccess: (data) => {
            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.lists() });

            // Invalidate or update the specific scenario
            const id = data.scenarioId;
            queryClient.invalidateQueries({
                queryKey: SCENARIO_KEYS.detail(id),
            });

            clientLogger.info(`Scenario ${id} saved successfully`);
        },
        onError: (error) => {
            clientLogger.error("Error saving scenario:", error);
        },
    });
}

export function useDeleteScenarioMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/scenarios?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete scenario");
            }

            return await response.json();
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.lists() });
            queryClient.removeQueries({ queryKey: SCENARIO_KEYS.detail(id) });
            clientLogger.info(`Scenario ${id} deleted successfully`);
        },
        onError: (error) => {
            clientLogger.error("Error deleting scenario:", error);
        },
    });
}
