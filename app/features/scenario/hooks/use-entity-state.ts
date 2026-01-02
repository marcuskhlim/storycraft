"use client";

import { useState, useCallback } from "react";
import { clientLogger } from "@/lib/utils/client-logger";

interface Entity {
    name: string;
    description: string;
    [key: string]: string | number | boolean | undefined | null;
}

interface UseEntityStateOptions<T extends Entity> {
    entities: T[] | undefined;
    onUpdateEntities: (
        updatedEntities: T[],
        updatedScenarioText?: string,
    ) => void;
    deleteEntityAction: (
        scenarioText: string,
        name: string,
        description: string,
    ) => Promise<{ updatedScenario: string }>;
    scenarioText: string | undefined;
    entityType: string;
    defaultNewEntity: T;
    loadingStates?: Set<number>;
}

export function useEntityState<T extends Entity>({
    entities = [],
    onUpdateEntities,
    deleteEntityAction,
    scenarioText = "",
    entityType,
    defaultNewEntity,
    loadingStates,
}: UseEntityStateOptions<T>) {
    const [localLoading, setLocalLoading] = useState<Set<number>>(new Set());
    const [newEntityIndex, setNewEntityIndex] = useState<number | null>(null);

    const isLoading = useCallback(
        (index: number) => {
            return loadingStates?.has(index) || localLoading.has(index);
        },
        [loadingStates, localLoading],
    );

    const handleUpdate = useCallback(
        (index: number, updatedEntity: T) => {
            const updatedEntities = [...entities];
            updatedEntities[index] = {
                ...updatedEntities[index],
                ...updatedEntity,
            };
            onUpdateEntities(updatedEntities);
            if (newEntityIndex === index) setNewEntityIndex(null);
        },
        [entities, onUpdateEntities, newEntityIndex],
    );

    const handleAdd = useCallback(() => {
        const updatedEntities = [...entities, defaultNewEntity];
        onUpdateEntities(updatedEntities);
        setNewEntityIndex(updatedEntities.length - 1);
    }, [entities, onUpdateEntities, defaultNewEntity]);

    const handleRemove = useCallback(
        async (index: number) => {
            setLocalLoading((prev) => new Set([...prev, index]));
            try {
                const response = await deleteEntityAction(
                    scenarioText,
                    entities[index].name,
                    entities[index].description,
                );
                const updatedEntities = entities.filter((_, i) => i !== index);
                onUpdateEntities(updatedEntities, response.updatedScenario);
            } catch (error) {
                clientLogger.error(`Error deleting ${entityType}:`, error);
            } finally {
                setLocalLoading((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }
        },
        [
            entities,
            scenarioText,
            deleteEntityAction,
            onUpdateEntities,
            entityType,
        ],
    );

    return {
        isLoading,
        handleUpdate,
        handleAdd,
        handleRemove,
        newEntityIndex,
        setNewEntityIndex,
    };
}
