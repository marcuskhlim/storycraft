"use client";

import { useCallback } from "react";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useScenarioActions } from "@/app/features/scenario/hooks/use-scenario-actions";
import {
    deleteCharacterFromScenario,
    deleteSettingFromScenario,
    deletePropFromScenario,
} from "@/app/features/scenario/actions/modify-scenario";
import { useEntityState } from "./use-entity-state";
import { Scenario } from "@/app/types";

export function useScenarioTabState() {
    const { scenario, setScenario } = useScenarioStore();
    const {
        scenario: isGeneratingStoryboard,
        characters: generatingCharacterImages,
        settings: generatingSettingImages,
        props: generatingPropImages,
    } = useLoadingStore();

    const {
        handleGenerateStoryBoard,
        handleRegenerateCharacterImage,
        handleUploadCharacterImage,
        handleRegenerateSettingImage,
        handleUploadSettingImage,
        handleRegeneratePropImage,
        handleUploadPropImage,
    } = useScenarioActions();

    const updateCharacters = useCallback(
        (
            updatedCharacters: Scenario["characters"],
            updatedScenarioText?: string,
        ) => {
            if (scenario) {
                setScenario({
                    ...scenario,
                    characters: updatedCharacters,
                    scenario: updatedScenarioText ?? scenario.scenario,
                });
            }
        },
        [scenario, setScenario],
    );

    const {
        isLoading: isCharacterLoading,
        handleUpdate: handleUpdateCharacter,
        handleAdd: handleAddCharacter,
        handleRemove: handleRemoveCharacter,
        newEntityIndex: newCharacterIndex,
    } = useEntityState({
        entities: scenario?.characters,
        onUpdateEntities: updateCharacters,
        deleteEntityAction: deleteCharacterFromScenario,
        scenarioText: scenario?.scenario,
        entityType: "character",
        defaultNewEntity: {
            name: "New Character",
            description: "Enter character description...",
            voice: "",
        },
        loadingStates: generatingCharacterImages,
    });

    const updateSettings = useCallback(
        (
            updatedSettings: Scenario["settings"],
            updatedScenarioText?: string,
        ) => {
            if (scenario) {
                setScenario({
                    ...scenario,
                    settings: updatedSettings,
                    scenario: updatedScenarioText ?? scenario.scenario,
                });
            }
        },
        [scenario, setScenario],
    );

    const {
        isLoading: isSettingLoading,
        handleUpdate: handleUpdateSetting,
        handleAdd: handleAddSetting,
        handleRemove: handleRemoveSetting,
        newEntityIndex: newSettingIndex,
    } = useEntityState({
        entities: scenario?.settings,
        onUpdateEntities: updateSettings,
        deleteEntityAction: deleteSettingFromScenario,
        scenarioText: scenario?.scenario,
        entityType: "setting",
        defaultNewEntity: {
            name: "New Setting",
            description: "Enter setting description...",
        },
        loadingStates: generatingSettingImages,
    });

    const updateProps = useCallback(
        (updatedProps: Scenario["props"], updatedScenarioText?: string) => {
            if (scenario) {
                setScenario({
                    ...scenario,
                    props: updatedProps,
                    scenario: updatedScenarioText ?? scenario.scenario,
                });
            }
        },
        [scenario, setScenario],
    );

    const {
        isLoading: isPropLoading,
        handleUpdate: handleUpdateProp,
        handleAdd: handleAddProp,
        handleRemove: handleRemoveProp,
        newEntityIndex: newPropIndex,
    } = useEntityState({
        entities: scenario?.props,
        onUpdateEntities: updateProps,
        deleteEntityAction: deletePropFromScenario,
        scenarioText: scenario?.scenario,
        entityType: "prop",
        defaultNewEntity: {
            name: "New Prop",
            description: "Enter prop description...",
        },
        loadingStates: generatingPropImages,
    });

    const handleUpdateScenarioDescription = useCallback(
        (newDescription: string) => {
            if (scenario) {
                setScenario({ ...scenario, scenario: newDescription });
            }
        },
        [scenario, setScenario],
    );

    const handleUpdateMusic = useCallback(
        (newMusic: string) => {
            if (scenario) {
                setScenario({ ...scenario, music: newMusic });
            }
        },
        [scenario, setScenario],
    );

    return {
        scenario,
        isGeneratingStoryboard,
        handleGenerateStoryBoard,
        handleUpdateScenarioDescription,
        handleUpdateMusic,
        // Characters
        isCharacterLoading,
        handleUpdateCharacter,
        handleAddCharacter,
        handleRemoveCharacter,
        handleRegenerateCharacterImage,
        handleUploadCharacterImage,
        newCharacterIndex,
        // Settings
        isSettingLoading,
        handleUpdateSetting,
        handleAddSetting,
        handleRemoveSetting,
        handleRegenerateSettingImage,
        handleUploadSettingImage,
        newSettingIndex,
        // Props
        isPropLoading,
        handleUpdateProp,
        handleAddProp,
        handleRemoveProp,
        handleRegeneratePropImage,
        handleUploadPropImage,
        newPropIndex,
    };
}
