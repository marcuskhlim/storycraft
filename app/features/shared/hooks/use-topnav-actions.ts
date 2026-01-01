"use client";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { BookOpen, LayoutGrid, PenLine, Scissors } from "lucide-react";

export function useTopNavActions() {
    const { scenario } = useScenarioStore();
    const { activeTab, setActiveTab } = useEditorStore();

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

    return {
        steps,
        activeTab,
        handleTabChange: setActiveTab,
    };
}
