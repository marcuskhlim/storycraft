"use client";

import { useState, useCallback } from "react";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useScenarioActions } from "@/app/features/scenario/hooks/use-scenario-actions";
import {
    deleteCharacterFromScenario,
    deleteSettingFromScenario,
    deletePropFromScenario,
} from "@/app/features/scenario/actions/modify-scenario";
import { clientLogger } from "@/lib/utils/client-logger";

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

    const [localLoadingCharacters, setLocalLoadingCharacters] = useState<
        Set<number>
    >(new Set());
    const [localLoadingSettings, setLocalLoadingSettings] = useState<
        Set<number>
    >(new Set());
    const [localLoadingProps, setLocalLoadingProps] = useState<Set<number>>(
        new Set(),
    );

    const [newCharacterIndex, setNewCharacterIndex] = useState<number | null>(
        null,
    );
    const [newSettingIndex, setNewSettingIndex] = useState<number | null>(null);
    const [newPropIndex, setNewPropIndex] = useState<number | null>(null);

    const isCharacterLoading = (index: number) => {
        return (
            generatingCharacterImages?.has(index) ||
            localLoadingCharacters.has(index)
        );
    };

    const isSettingLoading = (index: number) => {
        return (
            generatingSettingImages?.has(index) ||
            localLoadingSettings.has(index)
        );
    };

    const isPropLoading = (index: number) => {
        return generatingPropImages?.has(index) || localLoadingProps.has(index);
    };

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

    const handleUpdateCharacter = useCallback(
        (
            index: number,
            updatedCharacter: {
                name: string;
                description: string;
                voice?: string;
            },
        ) => {
            if (scenario) {
                const updatedCharacters = [...scenario.characters];
                updatedCharacters[index] = {
                    ...updatedCharacters[index],
                    ...updatedCharacter,
                };
                setScenario({ ...scenario, characters: updatedCharacters });
                if (newCharacterIndex === index) setNewCharacterIndex(null);
            }
        },
        [scenario, setScenario, newCharacterIndex],
    );

    const handleAddCharacter = useCallback(() => {
        if (scenario) {
            const newCharacter = {
                name: "New Character",
                description: "Enter character description...",
                voice: "",
            };
            const updatedCharacters = [...scenario.characters, newCharacter];
            setScenario({ ...scenario, characters: updatedCharacters });
            setNewCharacterIndex(updatedCharacters.length - 1);
        }
    }, [scenario, setScenario]);

    const handleRemoveCharacter = useCallback(
        async (index: number) => {
            if (scenario) {
                setLocalLoadingCharacters((prev) => new Set([...prev, index]));
                try {
                    const newScenarioData = await deleteCharacterFromScenario(
                        scenario.scenario,
                        scenario.characters[index].name,
                        scenario.characters[index].description,
                    );
                    const updatedCharacters = scenario.characters.filter(
                        (_, i) => i !== index,
                    );
                    setScenario({
                        ...scenario,
                        characters: updatedCharacters,
                        scenario: newScenarioData.updatedScenario,
                    });
                } catch (error) {
                    clientLogger.error("Error deleting character:", error);
                } finally {
                    setLocalLoadingCharacters((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(index);
                        return newSet;
                    });
                }
            }
        },
        [scenario, setScenario],
    );

    const handleUpdateSetting = useCallback(
        (
            index: number,
            updatedSetting: { name: string; description: string },
        ) => {
            if (scenario) {
                const updatedSettings = [...scenario.settings];
                updatedSettings[index] = {
                    ...updatedSettings[index],
                    ...updatedSetting,
                };
                setScenario({ ...scenario, settings: updatedSettings });
                if (newSettingIndex === index) setNewSettingIndex(null);
            }
        },
        [scenario, setScenario, newSettingIndex],
    );

    const handleAddSetting = useCallback(() => {
        if (scenario) {
            const newSetting = {
                name: "New Setting",
                description: "Enter setting description...",
            };
            const updatedSettings = [...scenario.settings, newSetting];
            setScenario({ ...scenario, settings: updatedSettings });
            setNewSettingIndex(updatedSettings.length - 1);
        }
    }, [scenario, setScenario]);

    const handleRemoveSetting = useCallback(
        async (index: number) => {
            if (scenario) {
                setLocalLoadingSettings((prev) => new Set([...prev, index]));
                try {
                    const newScenarioData = await deleteSettingFromScenario(
                        scenario.scenario,
                        scenario.settings[index].name,
                        scenario.settings[index].description,
                    );
                    const updatedSettings = scenario.settings.filter(
                        (_, i) => i !== index,
                    );
                    setScenario({
                        ...scenario,
                        settings: updatedSettings,
                        scenario: newScenarioData.updatedScenario,
                    });
                } catch (error) {
                    clientLogger.error("Error deleting setting:", error);
                } finally {
                    setLocalLoadingSettings((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(index);
                        return newSet;
                    });
                }
            }
        },
        [scenario, setScenario],
    );

    const handleUpdateProp = useCallback(
        (index: number, updatedProp: { name: string; description: string }) => {
            if (scenario) {
                const updatedProps = [...scenario.props];
                updatedProps[index] = {
                    ...updatedProps[index],
                    ...updatedProp,
                };
                setScenario({ ...scenario, props: updatedProps });
                if (newPropIndex === index) setNewPropIndex(null);
            }
        },
        [scenario, setScenario, newPropIndex],
    );

    const handleAddProp = useCallback(() => {
        if (scenario) {
            const newProp = {
                name: "New Prop",
                description: "Enter prop description...",
            };
            const updatedProps = [...scenario.props, newProp];
            setScenario({ ...scenario, props: updatedProps });
            setNewPropIndex(updatedProps.length - 1);
        }
    }, [scenario, setScenario]);

    const handleRemoveProp = useCallback(
        async (index: number) => {
            if (scenario) {
                setLocalLoadingProps((prev) => new Set([...prev, index]));
                try {
                    const newScenarioData = await deletePropFromScenario(
                        scenario.scenario,
                        scenario.props[index].name,
                        scenario.props[index].description,
                    );
                    const updatedProps = scenario.props.filter(
                        (_, i) => i !== index,
                    );
                    setScenario({
                        ...scenario,
                        props: updatedProps,
                        scenario: newScenarioData.updatedScenario,
                    });
                } catch (error) {
                    clientLogger.error("Error deleting prop:", error);
                } finally {
                    setLocalLoadingProps((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(index);
                        return newSet;
                    });
                }
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
