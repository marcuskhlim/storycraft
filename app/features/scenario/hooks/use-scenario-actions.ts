import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useSettings } from "@/app/features/shared/hooks/use-settings";
import { clientLogger } from "@/lib/utils/client-logger";
import { generateStoryboard } from "@/app/features/scenario/actions/generate-scenes";
import {
    regenerateCharacterAndScenarioFromText,
    regenerateCharacterAndScenarioFromImage,
    regenerateSettingAndScenarioFromText,
    regenerateSettingAndScenarioFromImage,
    regeneratePropAndScenarioFromText,
    regeneratePropAndScenarioFromImage,
} from "@/app/features/scenario/actions/modify-scenario";
import { useImageUpload } from "@/app/features/shared/hooks/use-image-upload";
import { toast } from "sonner";

export function useScenarioActions() {
    const {
        scenario,
        numScenes,
        style,
        language,
        setScenario,
        setErrorMessage,
    } = useScenarioStore();

    const { setLoading, startLoading, stopLoading } = useLoadingStore();
    const { setActiveTab } = useEditorStore();
    const { settings } = useSettings();
    const { uploadImageFile } = useImageUpload();

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
            setActiveTab("storyboard");
        } catch (error) {
            clientLogger.error("Error generating storyboard:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating storyboard";
            setErrorMessage(message);
            toast.error(message);
            setActiveTab("scenario");
        } finally {
            setLoading("scenario", false);
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

            const updatedCharacters = [...scenario.characters];
            updatedCharacters[characterIndex] = {
                ...updatedCharacters[characterIndex],
                name: name,
                description: description,
                voice: voice,
                imageGcsUri: newImageGcsUri,
            };

            setScenario({
                ...scenario,
                characters: updatedCharacters,
                scenario: newScenarioText,
            });
        } catch (error) {
            clientLogger.error("Error regenerating character image:", error);
            const message = `Failed to regenerate character image: ${error instanceof Error ? error.message : "Unknown error"}`;
            setErrorMessage(message);
            toast.error(message);
        } finally {
            stopLoading("characters", characterIndex);
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
            const resizedImageGcsUri = await uploadImageFile(file);

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
            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the character image";
            setErrorMessage(message);
            toast.error(message);
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

            const updatedSettings = [...scenario.settings];
            updatedSettings[settingIndex] = {
                ...updatedSettings[settingIndex],
                name: name,
                description: description,
                imageGcsUri: newImageGcsUri,
            };

            setScenario({
                ...scenario,
                settings: updatedSettings,
                scenario: newScenarioText,
            });
        } catch (error) {
            clientLogger.error("Error regenerating setting image:", error);
            const message = `Failed to regenerate setting image: ${error instanceof Error ? error.message : "Unknown error"}`;
            setErrorMessage(message);
            toast.error(message);
        } finally {
            stopLoading("settings", settingIndex);
        }
    };

    const handleUploadSettingImage = async (
        settingIndex: number,
        file: File,
    ) => {
        if (!scenario) return;

        setErrorMessage(null);
        startLoading("settings", settingIndex);

        try {
            const resizedImageGcsUri = await uploadImageFile(file);

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
            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the setting image";
            setErrorMessage(message);
            toast.error(message);
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

            const updatedProps = [...scenario.props];
            updatedProps[propIndex] = {
                ...updatedProps[propIndex],
                name: name,
                description: description,
                imageGcsUri: newImageGcsUri,
            };

            setScenario({
                ...scenario,
                props: updatedProps,
                scenario: newScenarioText,
            });
        } catch (error) {
            clientLogger.error("Error regenerating prop image:", error);
            const message = `Failed to regenerate prop image: ${error instanceof Error ? error.message : "Unknown error"}`;
            setErrorMessage(message);
            toast.error(message);
        } finally {
            stopLoading("props", propIndex);
        }
    };

    const handleUploadPropImage = async (propIndex: number, file: File) => {
        if (!scenario) return;

        setErrorMessage(null);
        startLoading("props", propIndex);

        try {
            const resizedImageGcsUri = await uploadImageFile(file);

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
            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while uploading the prop image";
            setErrorMessage(message);
            toast.error(message);
        } finally {
            stopLoading("props", propIndex);
        }
    };

    return {
        handleGenerateStoryBoard,
        handleRegenerateCharacterImage,
        handleUploadCharacterImage,
        handleRegenerateSettingImage,
        handleUploadSettingImage,
        handleRegeneratePropImage,
        handleUploadPropImage,
    };
}
