"use client";

import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { useTimeline } from "@/app/features/editor/hooks/use-timeline";
import { BookOpen, LayoutGrid, PenLine, Scissors } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import {
    generateScenario,
    generateStoryboard,
} from "@/app/features/scenario/actions/generate-scenes";
import { exportVideoClient } from "@/lib/utils/client-export";
import { clientLogger } from "@/lib/utils/client-logger";

import { resizeImage } from "@/app/features/storyboard/actions/resize-image";
import { CreateTab } from "@/app/features/create/components/create-tab";
import { type Style } from "@/app/features/create/components/style-selector";
import { EditorTab } from "@/app/features/editor/components/editor-tab";
import { ScenarioTab } from "@/app/features/scenario/components/scenario-tab";
import { StoryboardTab } from "@/app/features/storyboard/components/storyboard-tab";
import { UserProfile } from "@/app/features/shared/components/user-profile";
import { Scenario, Scene, TimelineLayer, type Language } from "./types";
import {
    regenerateCharacterAndScenarioFromText,
    regenerateCharacterAndScenarioFromImage,
    regenerateSettingAndScenarioFromImage,
    regenerateSettingAndScenarioFromText,
    regeneratePropAndScenarioFromImage,
    regeneratePropAndScenarioFromText,
} from "@/app/features/scenario/actions/modify-scenario";
import { Sidebar } from "@/app/features/shared/components/layout/sidebar";
import { TopNav } from "@/app/features/shared/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/features/shared/hooks/use-settings";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";

const styles: Style[] = [
    { name: "Photographic", image: "/styles/photographic_v2.png" },
    { name: "2D Animation", image: "/styles/2d.png" },
    { name: "Anime", image: "/styles/anime.png" },
    { name: "3D Animation", image: "/styles/3d.png" },
    { name: "Claymation", image: "/styles/claymation.png" },
];

const DEFAULT_LANGUAGE: Language = {
    name: "English (United States)",
    code: "en-US",
};

const VALID_DURATIONS = [4, 6, 8] as const;
type ValidDuration = (typeof VALID_DURATIONS)[number];

const validateDuration = (duration: number): number => {
    return VALID_DURATIONS.includes(duration as ValidDuration) ? duration : 8;
};

export default function Home() {
    // Zustand Stores
    const {
        pitch,
        name,
        style,
        aspectRatio,
        durationSeconds,
        language,
        styleImageUri,
        logoOverlay,
        numScenes,
        scenario,
        setField,
        setScenario,
        setErrorMessage,
        setVideoUri,
        setVttUri,
        reset: resetScenarioStore,
    } = useScenarioStore();

    const {
        setLoading,
        startLoading,
        stopLoading,
        scenes: generatingScenes,
    } = useLoadingStore();

    const {
        activeTab,
        isSidebarCollapsed,
        sidebarRefreshTrigger,
        setActiveTab,
        setCurrentTime,
        setIsSidebarCollapsed,
        triggerSidebarRefresh,
        setExportProgress,
    } = useEditorStore();

    // Ref to track when we're loading a scenario from sidebar (to prevent auto-save with stale data)
    const isLoadingScenarioRef = useRef(false);

    // Scenario auto-save functionality
    const {
        saveScenarioDebounced,
        getCurrentScenarioId,
        setCurrentScenarioId,
        isAuthenticated,
    } = useScenario();

    // Timeline persistence
    const { resetTimeline } = useTimeline();

    // Global settings
    const { settings } = useSettings();

    // Auto-save scenario whenever it changes (debounced)
    // Skip auto-save when loading a scenario from sidebar to prevent overwriting with stale data
    useEffect(() => {
        if (isLoadingScenarioRef.current) {
            // Reset the flag after skipping this save
            isLoadingScenarioRef.current = false;
            return;
        }
        if (scenario && isAuthenticated) {
            saveScenarioDebounced(
                scenario,
                getCurrentScenarioId() || undefined,
            );
            // Trigger sidebar refresh after save (with a small delay to allow debounced save to complete)
            setTimeout(() => {
                triggerSidebarRefresh();
            }, 1500); // Wait longer than the 1s debounce
        }
    }, [
        scenario,
        isAuthenticated,
        saveScenarioDebounced,
        getCurrentScenarioId,
        triggerSidebarRefresh,
    ]);

    const handleGenerate = async (
        modelName?: string,
        thinkingBudget?: number,
    ) => {
        const targetModel = modelName || settings.llmModel;
        const targetBudget =
            thinkingBudget !== undefined
                ? thinkingBudget
                : settings.thinkingBudget;

        if (pitch.trim() === "" || numScenes < 1) return;
        setLoading("scenario", true);
        setErrorMessage(null);
        try {
            const scenarioData = await generateScenario(
                name,
                pitch,
                numScenes,
                style,
                aspectRatio,
                durationSeconds,
                language,
                targetModel,
                targetBudget,
                styleImageUri || undefined,
            );

            if (logoOverlay) {
                scenarioData.logoOverlay = logoOverlay;
            }
            setScenario(scenarioData);
            setActiveTab("scenario"); // Switch to scenario tab after successful generation
        } catch (error) {
            clientLogger.error("Error generating scenes:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating scenes",
            );
        } finally {
            setLoading("scenario", false);
        }
    };

    const handleRegenerateImage = async (index: number) => {
        if (!scenario) return;

        startLoading("scenes", index);
        setErrorMessage(null);
        try {
            // Regenerate a single image
            const scene = scenario.scenes[index];

            const response = await fetch("/api/regenerate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: scene.imagePrompt,
                    scenario: scenario,
                    modelName: settings.imageModel,
                }),
            });

            const result = await response.json();

            const { imageGcsUri } = result;
            const errorMessage = result.errorMessage;

            const updatedScenes = [...scenario.scenes];
            updatedScenes[index] = {
                ...updatedScenes[index],
                imageGcsUri,
                videoUri: undefined,
                errorMessage: errorMessage,
            };

            setScenario({
                ...scenario,
                scenes: updatedScenes,
            });
        } catch (error) {
            clientLogger.error("Error regenerating images:", error);
            setErrorMessage(
                `${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            stopLoading("scenes", index);
        }
    };

    const handleRegenerateCharacterImage = async (
        characterIndex: number,
        name: string,
        description: string,
        voice: string,
    ) => {
        if (!scenario) return;

        startLoading("characters", characterIndex);
        setErrorMessage(null);
        try {
            // Regenerate character image using the updated description
            const { updatedScenario: newScenarioText, newImageGcsUri } =
                await regenerateCharacterAndScenarioFromText(
                    scenario.scenario,
                    scenario.characters[characterIndex].name,
                    name,
                    description,
                    style,
                    settings.llmModel,
                    settings.thinkingBudget,
                    settings.imageModel,
                );

            // Update the character with the new image AND the updated description
            const updatedCharacters = [...scenario.characters];
            updatedCharacters[characterIndex] = {
                ...updatedCharacters[characterIndex],
                name: name, // Preserve the updated name
                description: description, // Preserve the updated description
                voice: voice,
                imageGcsUri: newImageGcsUri,
            };

            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters,
                scenario: newScenarioText,
            };

            setScenario(updatedScenario);
        } catch (error) {
            clientLogger.error("Error regenerating character image:", error);
            setErrorMessage(
                `Failed to regenerate character image: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            stopLoading("characters", characterIndex);
        }
    };

    const handleRegenerateSettingImage = async (
        settingIndex: number,
        name: string,
        description: string,
    ) => {
        if (!scenario) return;

        startLoading("settings", settingIndex);
        setErrorMessage(null);
        try {
            // Regenerate setting image using the updated description
            const { updatedScenario: newScenarioText, newImageGcsUri } =
                await regenerateSettingAndScenarioFromText(
                    scenario.scenario,
                    scenario.settings[settingIndex].name,
                    name,
                    description,
                    style,
                    scenario.aspectRatio,
                    settings.llmModel,
                    settings.thinkingBudget,
                    settings.imageModel,
                );

            // Update the setting with the new image AND the updated description
            const updatedSettings = [...scenario.settings];
            updatedSettings[settingIndex] = {
                ...updatedSettings[settingIndex],
                name: name, // Preserve the updated name
                description: description, // Preserve the updated description
                imageGcsUri: newImageGcsUri,
            };

            const updatedScenario = {
                ...scenario,
                settings: updatedSettings,
                scenario: newScenarioText,
            };

            setScenario(updatedScenario);
        } catch (error) {
            clientLogger.error("Error regenerating setting image:", error);
            setErrorMessage(
                `Failed to regenerate setting image: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            stopLoading("settings", settingIndex);
        }
    };

    const handleRegeneratePropImage = async (
        propIndex: number,
        name: string,
        description: string,
    ) => {
        if (!scenario) return;

        startLoading("props", propIndex);
        setErrorMessage(null);
        try {
            // Regenerate prop image using the updated description
            const { updatedScenario: newScenarioText, newImageGcsUri } =
                await regeneratePropAndScenarioFromText(
                    scenario.scenario,
                    scenario.props[propIndex].name,
                    name,
                    description,
                    style,
                    settings.llmModel,
                    settings.thinkingBudget,
                    settings.imageModel,
                );

            // Update the prop with the new image AND the updated description
            const updatedProps = [...scenario.props];
            updatedProps[propIndex] = {
                ...updatedProps[propIndex],
                name: name, // Preserve the updated name
                description: description, // Preserve the updated description
                imageGcsUri: newImageGcsUri,
            };

            const updatedScenario = {
                ...scenario,
                props: updatedProps,
                scenario: newScenarioText,
            };

            setScenario(updatedScenario);
        } catch (error) {
            clientLogger.error("Error regenerating prop image:", error);
            setErrorMessage(
                `Failed to regenerate prop image: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            stopLoading("props", propIndex);
        }
    };

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
            // setActiveTab("video") // Don't switch (removed per request)
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

    const handleGenerateAllVideos = async (
        model?: string,
        generateAudio?: boolean,
    ) => {
        const targetModel = model || settings.videoModel;
        const targetAudio =
            generateAudio !== undefined
                ? generateAudio
                : settings.generateAudio;

        if (!scenario) return;
        setErrorMessage(null);
        clientLogger.log("[Client] Generating videos for all scenes - START");

        scenario.scenes.forEach((_, i) => startLoading("scenes", i));

        // Reset timeline when regenerating videos so EditorTab reinitializes from fresh scenario
        const scenarioId = getCurrentScenarioId();
        if (scenarioId) {
            try {
                await resetTimeline(scenarioId);
                clientLogger.log("Timeline reset for video regeneration");
            } catch (error) {
                clientLogger.error("Failed to reset timeline:", error);
            }
        }

        const regeneratedScenes = await Promise.all(
            scenario.scenes.map(async (scene, index) => {
                try {
                    const response = await fetch("/api/videos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            scenes: [scene],
                            scenario: scenario,
                            language: scenario?.language,
                            aspectRatio: scenario?.aspectRatio,
                            model: targetModel,
                            generateAudio: targetAudio,
                            durationSeconds: scenario?.durationSeconds,
                        }),
                    });

                    const { success, videoUrls, error } = await response.json();

                    if (success) {
                        return {
                            ...scene,
                            videoUri: videoUrls[0] || undefined,
                        };
                    } else {
                        throw new Error(error);
                    }
                } catch (error) {
                    clientLogger.error("Error regenerating video:", error);
                    if (error instanceof Error) {
                        return {
                            ...scene,
                            videoUri: undefined,
                            errorMessage: error.message,
                        };
                    } else {
                        return { ...scene, videoUri: undefined };
                    }
                } finally {
                    stopLoading("scenes", index);
                }
            }),
        );

        setScenario({
            ...scenario,
            scenes: regeneratedScenes,
        });
        setActiveTab("editor");
    };

    const handleGenerateStoryBoard = async () => {
        clientLogger.log("Generating storyboard");

        if (!scenario) return;
        setLoading("scenario", true);
        setErrorMessage(null);
        try {
            const scenarioWithStoryboard = await generateStoryboard(
                scenario,
                numScenes,
                style,
                language,
                settings.llmModel,
                settings.thinkingBudget,
            );
            setScenario(scenarioWithStoryboard);
            setActiveTab("storyboard"); // Switch to storyboard tab after successful generation
        } catch (error) {
            clientLogger.error("Error generating storyboard:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating storyboard",
            );
            setActiveTab("scenario"); // Stay on scenario tab if there's an error
        } finally {
            setLoading("scenario", false);
        }
    };

    const handleGenerateVideo = async (index: number) => {
        if (!scenario) return;
        setErrorMessage(null);
        startLoading("scenes", index);
        try {
            // Single scene generation logic remains the same
            const scene = scenario.scenes[index];
            clientLogger.log("scene", scene);

            const response = await fetch("/api/videos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scenes: [scene],
                    scenario: scenario,
                    language: scenario?.language,
                    aspectRatio: scenario?.aspectRatio,
                    model: settings.videoModel,
                    generateAudio: settings.generateAudio,
                    durationSeconds: scenario?.durationSeconds,
                }),
            });

            const { success, videoUrls, error } = await response.json();

            if (success) {
                const videoUri = success ? videoUrls[0] : undefined;

                const updatedScenes = [...scenario.scenes];
                updatedScenes[index] = {
                    ...updatedScenes[index],
                    videoUri,
                    errorMessage: undefined,
                };

                setScenario({
                    ...scenario,
                    scenes: updatedScenes,
                });
            } else {
                throw new Error(error);
            }
        } catch (error) {
            clientLogger.error("[Client] Error generating video:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating video",
            );

            const updatedScenes = scenario.scenes.map((s, i) => {
                if (i === index) {
                    if (error instanceof Error) {
                        return {
                            ...s,
                            videoUri: undefined,
                            errorMessage: error.message,
                        };
                    } else {
                        return { ...s, videoUri: undefined };
                    }
                } else {
                    return s;
                }
            });

            setScenario({
                ...scenario,
                scenes: updatedScenes,
            });
        } finally {
            clientLogger.log(`[Client] Generating video done`);
            stopLoading("scenes", index);
        }
    };

    const handleUpdateScene = (index: number, updatedScene: Scene) => {
        if (!scenario) return;

        const newScenes = [...scenario.scenes];
        newScenes[index] = updatedScene;

        setScenario({
            ...scenario,
            scenes: newScenes,
        });
    };

    const handleUploadImage = async (index: number, file: File) => {
        if (!scenario) return;

        setErrorMessage(null);

        startLoading("scenes", index);

        try {
            const reader = new FileReader();

            const uploadPromise = new Promise<string>((resolve, reject) => {
                reader.onloadend = async () => {
                    try {
                        const base64String = reader.result as string;

                        const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix

                        const resizedImageGcsUri =
                            await resizeImage(imageBase64);

                        resolve(resizedImageGcsUri);
                    } catch (e) {
                        reject(e);
                    }
                };

                reader.onerror = () =>
                    reject(new Error("Failed to read the image file"));

                reader.readAsDataURL(file);
            });

            const resizedImageGcsUri = await uploadPromise;

            const updatedScenes = [...scenario.scenes];

            updatedScenes[index] = {
                ...updatedScenes[index],

                imageGcsUri: resizedImageGcsUri,

                videoUri: undefined,
            };

            setScenario({
                ...scenario,

                scenes: updatedScenes,
            });
        } catch (error) {
            clientLogger.error("Error uploading image:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the image",
            );
        } finally {
            stopLoading("scenes", index);
        }
    };

    const handleUploadSettingImage = async (
        settingIndex: number,
        file: File,
    ) => {
        if (!scenario) return;

        clientLogger.log(
            "Starting setting image upload for index:",
            settingIndex,
        );
        setErrorMessage(null);
        startLoading("settings", settingIndex);

        try {
            const base64String = await new Promise<string>(
                (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = () => {
                        reject(new Error("Failed to read the image file"));
                    };
                    reader.readAsDataURL(file);
                },
            );

            const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
            const resizedImageGcsUri = await resizeImage(imageBase64);

            const setting = scenario.settings[settingIndex];
            clientLogger.log(
                "Calling regenerateSettingAndScenarioFromImage for setting:",
                setting.name,
            );
            const result = await regenerateSettingAndScenarioFromImage(
                scenario.scenario,
                scenario.settings[settingIndex].name,
                scenario.settings[settingIndex].description,
                resizedImageGcsUri,
                scenario.settings,
                style,
                settings.llmModel,
                settings.thinkingBudget,
                settings.imageModel,
            );
            clientLogger.log(
                "regenerateSettingAndScenarioFromImage completed successfully",
            );

            // Update scenario with new setting description and scenario text
            const updatedSettings = [...scenario.settings];
            if (result.updatedSetting) {
                updatedSettings[settingIndex] = {
                    ...updatedSettings[settingIndex],
                    description: result.updatedSetting.description,
                    name: result.updatedSetting.name,
                    imageGcsUri: result.newImageGcsUri,
                };
            }

            setScenario({
                ...scenario,
                scenario: result.updatedScenario,
                settings: updatedSettings,
            });
        } catch (error) {
            clientLogger.error("Error uploading setting image:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the setting image",
            );
        } finally {
            clientLogger.log(
                "Finishing setting image upload for index:",
                settingIndex,
            );
            stopLoading("settings", settingIndex);
        }
    };

    const handleUploadPropImage = async (propIndex: number, file: File) => {
        if (!scenario) return;

        clientLogger.log("Starting prop image upload for index:", propIndex);
        setErrorMessage(null);
        startLoading("props", propIndex);

        try {
            const base64String = await new Promise<string>(
                (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = () => {
                        reject(new Error("Failed to read the image file"));
                    };
                    reader.readAsDataURL(file);
                },
            );

            const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
            const resizedImageGcsUri = await resizeImage(imageBase64);

            const prop = scenario.props[propIndex];
            clientLogger.log(
                "Calling regeneratePropAndScenarioFromImage for prop:",
                prop.name,
            );
            const result = await regeneratePropAndScenarioFromImage(
                scenario.scenario,
                scenario.props[propIndex].name,
                scenario.props[propIndex].description,
                resizedImageGcsUri,
                scenario.props,
                style,
                settings.llmModel,
                settings.thinkingBudget,
                settings.imageModel,
            );
            clientLogger.log(
                "regeneratePropAndScenarioFromImage completed successfully",
            );

            // Update scenario with new prop description and scenario text
            const updatedProps = [...scenario.props];
            if (result.updatedProp) {
                updatedProps[propIndex] = {
                    ...updatedProps[propIndex],
                    description: result.updatedProp.description,
                    name: result.updatedProp.name,
                    imageGcsUri: result.newImageGcsUri,
                };
            }

            setScenario({
                ...scenario,
                scenario: result.updatedScenario,
                props: updatedProps,
            });
        } catch (error) {
            clientLogger.error("Error uploading prop image:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the prop image",
            );
        } finally {
            clientLogger.log(
                "Finishing prop image upload for index:",
                propIndex,
            );
            stopLoading("props", propIndex);
        }
    };

    const handleUploadCharacterImage = async (
        characterIndex: number,
        file: File,
    ) => {
        if (!scenario) return;

        clientLogger.log(
            "Starting character image upload for index:",
            characterIndex,
        );
        setErrorMessage(null);
        startLoading("characters", characterIndex);

        try {
            const base64String = await new Promise<string>(
                (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = () => {
                        reject(new Error("Failed to read the image file"));
                    };
                    reader.readAsDataURL(file);
                },
            );

            const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
            const resizedImageGcsUri = await resizeImage(imageBase64);

            const character = scenario.characters[characterIndex];
            clientLogger.log(
                "Calling regenerateCharacterAndScenarioFromImage for character:",
                character.name,
            );
            const result = await regenerateCharacterAndScenarioFromImage(
                scenario.scenario,
                scenario.characters[characterIndex].name,
                scenario.characters[characterIndex].description,
                scenario.characters[characterIndex].voice || "",
                resizedImageGcsUri,
                scenario.characters,
                style,
                settings.llmModel,
                settings.thinkingBudget,
                settings.imageModel,
            );
            clientLogger.log(
                "regenerateCharacterAndScenarioFromImage completed successfully",
            );

            // Update scenario with new character description and scenario text
            const updatedCharacters = [...scenario.characters];
            if (result.updatedCharacter) {
                updatedCharacters[characterIndex] = {
                    ...updatedCharacters[characterIndex],
                    description: result.updatedCharacter.description,
                    voice: result.updatedCharacter.voice,
                    name: result.updatedCharacter.name,
                    imageGcsUri: result.newImageGcsUri,
                };
            }

            setScenario({
                ...scenario,
                scenario: result.updatedScenario,
                characters: updatedCharacters,
            });
        } catch (error) {
            clientLogger.error("Error uploading character image:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the character image",
            );
        } finally {
            clientLogger.log(
                "Finishing character image upload for index:",
                characterIndex,
            );
            stopLoading("characters", characterIndex);
        }
    };

    // clientLogger.log("Component rendered");

    const steps = [
        {
            id: "create",
            label: "Pitch",
            icon: PenLine,
        },
        {
            id: "scenario",
            label: "Scenario",
            icon: BookOpen,
            disabled: !scenario,
        },
        {
            id: "storyboard",
            label: "Storyboard",
            icon: LayoutGrid,
            disabled: !scenario,
        },
        {
            id: "editor",
            label: "Editor",
            icon: Scissors,
            disabled:
                !scenario ||
                !scenario.scenes ||
                !scenario.scenes.every((scene) => scene.videoUri),
        },
    ];

    const handleSelectScenario = (
        selectedScenario: Scenario,
        scenarioId?: string,
    ) => {
        // Set the scenario ID from Firestore for future saves
        if (scenarioId) {
            setCurrentScenarioId(scenarioId);
        }

        // Mark that we're loading a scenario from sidebar to prevent auto-save with stale data
        isLoadingScenarioRef.current = true;

        // Load the existing scenario data
        setScenario(selectedScenario);

        // Populate form fields with existing data
        setField("name", selectedScenario.name || "");
        setField("pitch", selectedScenario.pitch || "");
        setField("style", selectedScenario.style || "Photographic");
        setField("aspectRatio", selectedScenario.aspectRatio || "16:9");
        setField("language", selectedScenario.language || DEFAULT_LANGUAGE);
        setField("numScenes", selectedScenario.scenes?.length || 6);
        setField(
            "durationSeconds",
            validateDuration(selectedScenario.durationSeconds || 8),
        );
        setField("logoOverlay", selectedScenario.logoOverlay || null);

        // Check if all scenes have videos to determine which tab to show
        const allScenesHaveVideos =
            selectedScenario.scenes &&
            selectedScenario.scenes.length > 0 &&
            selectedScenario.scenes.every((scene) => scene.videoUri);

        // Navigate to the appropriate tab based on the scenario's progress
        if (allScenesHaveVideos) {
            setActiveTab("editor"); // If videos are ready, go to editor
        } else if (
            selectedScenario.scenes &&
            selectedScenario.scenes.length > 0
        ) {
            setActiveTab("storyboard"); // If scenes exist, go to storyboard
        } else {
            setActiveTab("scenario"); // Otherwise, go to scenario
        }
    };

    const handleCreateNewStory = () => {
        // Reset scenario store to initial state
        resetScenarioStore();

        // Reset editor state
        setCurrentTime(0);

        // Clear the current scenario ID so a new one will be generated
        setCurrentScenarioId(null);

        // Navigate to the create tab
        setActiveTab("create");
    };

    const createEmptyScene = (): Scene => {
        return {
            imagePrompt: {
                Style: scenario?.style || "Photographic",
                Scene: "A new scene to be described",
                Composition: {
                    shot_type: "Medium Shot",
                    lighting: "Natural lighting",
                    overall_mood: "Neutral",
                },
                Subject: [],
                Prop: [],
                Context: [],
            },
            videoPrompt: {
                Action: "Describe the action happening in this scene",
                Camera_Motion: "Static camera",
                Ambiance_Audio: "Natural ambient sounds",
                Dialogue: [],
            },
            description: "A new scene that needs to be developed",
            voiceover: "Voiceover text for this scene",
            charactersPresent: [],
        };
    };

    const handleAddScene = () => {
        if (!scenario) return;

        const newScene = createEmptyScene();
        const updatedScenes = [...scenario.scenes, newScene];

        setScenario({
            ...scenario,
            scenes: updatedScenes,
        });
    };

    const handleRemoveScene = (index: number) => {
        if (!scenario || scenario.scenes.length <= 1) return;

        const updatedScenes = scenario.scenes.filter((_, i) => i !== index);

        // Clear any generating scenes that are affected by the removal
        // Note: The store will handle the Set structure correctly via stopLoading
        generatingScenes.forEach((sceneIndex) => {
            if (sceneIndex === index) {
                stopLoading("scenes", index);
            } else if (sceneIndex > index) {
                // This is a bit tricky with the current startLoading/stopLoading API
                // since we're re-indexing. In a full refactor, scenes would have IDs.
            }
        });

        setScenario({
            ...scenario,
            scenes: updatedScenes,
        });
    };

    const handleReorderScenes = (fromIndex: number, toIndex: number) => {
        if (!scenario || fromIndex === toIndex) return;

        const updatedScenes = [...scenario.scenes];
        const [movedScene] = updatedScenes.splice(fromIndex, 1);
        updatedScenes.splice(toIndex, 0, movedScene);

        // Update generating scenes indices - also tricky with current re-indexing
        // For now, just re-syncing scenario is most important

        setScenario({
            ...scenario,
            scenes: updatedScenes,
        });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background font-sans">
            {/* Left Sidebar */}
            <Sidebar
                currentScenarioId={getCurrentScenarioId() || undefined}
                onSelectScenario={handleSelectScenario}
                onCreateNewStory={handleCreateNewStory}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                refreshTrigger={sidebarRefreshTrigger}
            />

            {/* Main Content Area */}
            <main
                className={`flex flex-1 flex-col transition-all duration-300 ${isSidebarCollapsed ? "ml-[70px]" : "ml-[280px]"}`}
            >
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-card/50 px-6 backdrop-blur-sm">
                    <div className="flex w-1/3 items-center gap-4">
                        <div className="flex items-center gap-2 text-xl font-bold text-primary">
                            <Image
                                src="/logo6.png"
                                alt="StoryCraft Logo"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            StoryCraft
                        </div>
                    </div>

                    <div className="flex w-1/3 flex-1 justify-center">
                        <TopNav
                            steps={steps}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />
                    </div>

                    <div className="flex w-1/3 items-center justify-end gap-4">
                        <UserProfile isCollapsed={false} />
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
                    <div className="mx-auto max-w-7xl space-y-6">
                        {activeTab === "create" && (
                            <CreateTab
                                onGenerate={() => handleGenerate()}
                                styles={styles}
                            />
                        )}

                        {activeTab === "scenario" && (
                            <ScenarioTab
                                onGenerateStoryBoard={handleGenerateStoryBoard}
                                onRegenerateCharacterImage={
                                    handleRegenerateCharacterImage
                                }
                                onUploadCharacterImage={
                                    handleUploadCharacterImage
                                }
                                onRegenerateSettingImage={
                                    handleRegenerateSettingImage
                                }
                                onUploadSettingImage={handleUploadSettingImage}
                                onRegeneratePropImage={
                                    handleRegeneratePropImage
                                }
                                onUploadPropImage={handleUploadPropImage}
                            />
                        )}

                        {activeTab === "storyboard" && scenario && (
                            <StoryboardTab
                                onGenerateAllVideos={() =>
                                    handleGenerateAllVideos()
                                }
                                onUpdateScene={handleUpdateScene}
                                onRegenerateImage={handleRegenerateImage}
                                onGenerateVideo={handleGenerateVideo}
                                onUploadImage={handleUploadImage}
                                onAddScene={handleAddScene}
                                onRemoveScene={handleRemoveScene}
                                onReorderScenes={handleReorderScenes}
                            />
                        )}

                        {activeTab === "editor" && scenario && (
                            <EditorTab
                                scenarioId={getCurrentScenarioId()}
                                onExportMovie={handleExportMovie}
                            />
                        )}

                        {!scenario && activeTab !== "create" && (
                            <div className="flex h-[50vh] flex-col items-center justify-center text-muted-foreground">
                                <BookOpen className="mb-4 h-12 w-12 opacity-50" />
                                <p className="text-lg font-medium">
                                    Select a story from the sidebar or create a
                                    new one.
                                </p>
                                <Button
                                    onClick={handleCreateNewStory}
                                    variant="link"
                                    className="mt-2"
                                >
                                    Create New Story
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
