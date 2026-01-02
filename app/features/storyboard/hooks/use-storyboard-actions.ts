"use client";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useSettings } from "@/app/features/shared/hooks/use-settings";
import { clientLogger } from "@/lib/utils/client-logger";
import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { useTimeline } from "@/app/features/editor/hooks/use-timeline";
import { resizeImage } from "@/app/features/storyboard/actions/resize-image";
import { Scene } from "@/app/types";
import { ApiResponse } from "@/types/api";

export function useStoryboardActions() {
    const { scenario, setScenario, setErrorMessage } = useScenarioStore();

    const { startLoading, stopLoading } = useLoadingStore();
    const { setActiveTab } = useEditorStore();
    const { settings } = useSettings();
    const { getCurrentScenarioId } = useScenario();
    const { resetTimeline } = useTimeline();

    const handleRegenerateImage = async (index: number) => {
        if (!scenario) return;

        startLoading("scenes", index);
        setErrorMessage(null);
        try {
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

            const result = (await response.json()) as ApiResponse<{
                imageGcsUri?: string;
                success?: boolean;
                errorMessage?: string;
            }>;

            if (!result.success) {
                throw new Error(
                    result.error?.message || "Failed to regenerate image",
                );
            }

            const { imageGcsUri, errorMessage } = result.data || {};

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

                    const result = (await response.json()) as ApiResponse<{
                        videoUrls: string[];
                    }>;

                    if (result.success && result.data) {
                        return {
                            ...scene,
                            videoUri: result.data.videoUrls[0] || undefined,
                        };
                    } else {
                        throw new Error(
                            result.error?.message || "Failed to generate video",
                        );
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

    const handleGenerateVideo = async (index: number) => {
        if (!scenario) return;
        setErrorMessage(null);
        startLoading("scenes", index);
        try {
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

            const result = (await response.json()) as ApiResponse<{
                videoUrls: string[];
            }>;

            if (result.success && result.data) {
                const videoUri = result.data.videoUrls[0] || undefined;

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
                throw new Error(
                    result.error?.message || "Failed to generate video",
                );
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
                        const imageBase64 = base64String.split(",")[1];
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

        setScenario({
            ...scenario,
            scenes: updatedScenes,
        });
    };

    return {
        handleRegenerateImage,
        handleGenerateAllVideos,
        handleGenerateVideo,
        handleUpdateScene,
        handleUploadImage,
        handleAddScene,
        handleRemoveScene,
        handleReorderScenes,
    };
}
