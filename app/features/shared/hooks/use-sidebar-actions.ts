"use client";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { Scenario, type Language } from "@/app/types";
import { useRef } from "react";

const DEFAULT_LANGUAGE: Language = {
    name: "English (United States)",
    code: "en-US",
};

const VALID_DURATIONS = [4, 6, 8] as const;
type ValidDuration = (typeof VALID_DURATIONS)[number];

const validateDuration = (duration: number): number => {
    return VALID_DURATIONS.includes(duration as ValidDuration) ? duration : 8;
};

export function useSidebarActions() {
    const {
        setField,
        setScenario,
        reset: resetScenarioStore,
    } = useScenarioStore();
    const {
        setActiveTab,
        setCurrentTime,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        sidebarRefreshTrigger,
    } = useEditorStore();
    const { setCurrentScenarioId } = useScenario();

    // Ref to track when we're loading a scenario from sidebar (to prevent auto-save with stale data)
    // In a real refactor, this might move to a specialized hook or store
    const isLoadingScenarioRef = useRef(false);

    const handleSelectScenario = (
        selectedScenario: Scenario,
        scenarioId?: string,
    ) => {
        if (scenarioId) {
            setCurrentScenarioId(scenarioId);
        }

        isLoadingScenarioRef.current = true;
        setScenario(selectedScenario);

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

        const allScenesHaveVideos =
            selectedScenario.scenes &&
            selectedScenario.scenes.length > 0 &&
            selectedScenario.scenes.every((scene) => scene.videoUri);

        if (allScenesHaveVideos) {
            setActiveTab("editor");
        } else if (
            selectedScenario.scenes &&
            selectedScenario.scenes.length > 0
        ) {
            setActiveTab("storyboard");
        } else {
            setActiveTab("scenario");
        }
    };

    const handleCreateNewStory = () => {
        resetScenarioStore();
        setCurrentTime(0);
        setCurrentScenarioId(null);
        setActiveTab("create");
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return {
        handleSelectScenario,
        handleCreateNewStory,
        toggleSidebar,
        isCollapsed: isSidebarCollapsed,
        refreshTrigger: sidebarRefreshTrigger,
        isLoadingScenarioRef, // Exported to be used in page.tsx for the auto-save effect
    };
}
