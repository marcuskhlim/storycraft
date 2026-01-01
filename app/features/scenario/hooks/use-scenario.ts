import { useCallback, useRef } from "react";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import type { Scenario } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";
import {
    useSaveScenarioMutation,
    useDeleteScenarioMutation,
    useScenarios,
    SCENARIO_KEYS,
    ScenarioWithId,
} from "./use-scenarios-query";
import { useQueryClient } from "@tanstack/react-query";

export function useScenario() {
    const { session } = useAuth();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentScenarioIdRef = useRef<string | null>(null);
    const queryClient = useQueryClient();

    const saveMutation = useSaveScenarioMutation();
    const deleteMutation = useDeleteScenarioMutation();
    const {
        data: scenarios = [] as ScenarioWithId[],
        refetch: refetchScenarios,
        isLoading,
        error,
    } = useScenarios();

    const saveScenario = useCallback(
        async (scenario: Scenario, scenarioId?: string) => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot save scenario: user not authenticated",
                );
                return null;
            }

            try {
                const result = await saveMutation.mutateAsync({
                    scenario,
                    scenarioId: scenarioId || currentScenarioIdRef.current,
                });

                // Update the current scenario ID for future saves
                if (result.scenarioId) {
                    currentScenarioIdRef.current = result.scenarioId;
                }

                return result.scenarioId;
            } catch (error) {
                // Error is already logged in the mutation hook
                throw error;
            }
        },
        [session?.user?.id, saveMutation],
    );

    const saveScenarioDebounced = useCallback(
        (scenario: Scenario, scenarioId?: string) => {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for debounced save
            saveTimeoutRef.current = setTimeout(() => {
                saveScenario(scenario, scenarioId).catch((error) => {
                    clientLogger.error("Debounced save failed:", error);
                });
            }, 1000); // Wait 1 second after last change before saving
        },
        [saveScenario],
    );

    const loadScenario = useCallback(
        async (scenarioId: string): Promise<ScenarioWithId | null> => {
            if (!session?.user?.id) {
                clientLogger.warn(
                    "Cannot load scenario: user not authenticated",
                );
                return null;
            }

            try {
                // Try to get from cache first
                const cachedData = queryClient.getQueryData<ScenarioWithId>(
                    SCENARIO_KEYS.detail(scenarioId),
                );
                if (cachedData) {
                    currentScenarioIdRef.current = scenarioId;
                    return cachedData;
                }

                // If not in cache, fetch it
                const response = await fetch(`/api/scenarios?id=${scenarioId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error("Failed to load scenario");
                }

                const scenarioData = (await response.json()) as ScenarioWithId;

                // Seed the cache
                queryClient.setQueryData(
                    SCENARIO_KEYS.detail(scenarioId),
                    scenarioData,
                );

                // Update current scenario ID
                currentScenarioIdRef.current = scenarioId;

                return scenarioData;
            } catch (error) {
                clientLogger.error("Error loading scenario:", error);
                throw error;
            }
        },
        [session?.user?.id, queryClient],
    );

    const loadUserScenarios = useCallback(async (): Promise<
        ScenarioWithId[]
    > => {
        if (!session?.user?.id) {
            clientLogger.warn("Cannot load scenarios: user not authenticated");
            return [];
        }

        try {
            const result = await refetchScenarios();
            return (result.data as ScenarioWithId[]) || [];
        } catch (error) {
            clientLogger.error("Error loading user scenarios:", error);
            throw error;
        }
    }, [session?.user?.id, refetchScenarios]);

    const getCurrentScenarioId = useCallback(() => {
        return currentScenarioIdRef.current;
    }, []);

    const setCurrentScenarioId = useCallback((scenarioId: string | null) => {
        currentScenarioIdRef.current = scenarioId;
    }, []);

    return {
        saveScenario,
        saveScenarioDebounced,
        loadScenario,
        loadUserScenarios,
        getCurrentScenarioId,
        setCurrentScenarioId,
        isAuthenticated: !!session?.user?.id,
        // Expose React Query primitives for more advanced usage
        scenarios,
        isSaving: saveMutation.isPending,
        isDeleting: deleteMutation.isPending,
        deleteScenario: deleteMutation.mutateAsync,
        isLoading,
        error,
    };
}
