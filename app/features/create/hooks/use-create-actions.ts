"use client";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useSettings } from "@/app/features/shared/hooks/use-settings";
import { clientLogger } from "@/lib/utils/client-logger";
import { generateScenario } from "@/app/features/create/actions/generate-scenario";
import { toast } from "sonner";

export function useCreateActions() {
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
        setScenario,
        setErrorMessage,
    } = useScenarioStore();

    const { setLoading } = useLoadingStore();
    const { setActiveTab } = useEditorStore();
    const { settings } = useSettings();

    const handleGenerateScenario = async (
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
            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred while generating scenes";
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setLoading("scenario", false);
        }
    };

    return {
        handleGenerateScenario,
    };
}
