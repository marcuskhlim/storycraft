"use client";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useCreateActions } from "@/app/features/create/hooks/use-create-actions";
import { type Language } from "@/app/types";

export function useCreateTabState() {
    const {
        name,
        pitch,
        numScenes,
        style,
        aspectRatio,
        durationSeconds,
        language,
        styleImageUri,
        errorMessage,
        setField,
    } = useScenarioStore();

    const { scenario: isLoading } = useLoadingStore();
    const { handleGenerateScenario } = useCreateActions();

    const totalLength = numScenes * durationSeconds;

    const setName = (val: string) => setField("name", val);
    const setPitch = (val: string) => setField("pitch", val);
    const setNumScenes = (val: number) => setField("numScenes", val);
    const setStyle = (val: string) => setField("style", val);
    const setAspectRatio = (val: string) => setField("aspectRatio", val);
    const setDurationSeconds = (val: number) =>
        setField("durationSeconds", val);
    const setLanguage = (val: Language) => setField("language", val);
    const setStyleImageUri = (val: string | null) =>
        setField("styleImageUri", val);

    const canGenerate = pitch.trim() !== "" && name.trim() !== "";

    return {
        name,
        setName,
        pitch,
        setPitch,
        numScenes,
        setNumScenes,
        style,
        setStyle,
        aspectRatio,
        setAspectRatio,
        durationSeconds,
        setDurationSeconds,
        language,
        setLanguage,
        styleImageUri,
        setStyleImageUri,
        errorMessage,
        isLoading,
        totalLength,
        canGenerate,
        handleGenerateScenario,
    };
}
