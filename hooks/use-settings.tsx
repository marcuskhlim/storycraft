"use client";
import React, { createContext, useContext, useState } from "react";

export const LLM_OPTIONS = [
    {
        label: "Gemini 3.0 Pro Preview",
        modelName: "gemini-3-pro-preview",
        thinkingBudget: 0,
    },
    {
        label: "Gemini 3.0 Flash Preview",
        modelName: "gemini-3-flash-preview",
        thinkingBudget: 0,
    },
    {
        label: "Gemini 2.5 Flash",
        modelName: "gemini-2.5-flash",
        thinkingBudget: 0,
    },
    {
        label: "Gemini 2.5 Flash 💡",
        modelName: "gemini-2.5-flash",
        thinkingBudget: -1,
    },
    {
        label: "Gemini 2.5 Pro",
        modelName: "gemini-2.5-pro",
        thinkingBudget: 0,
    },
    {
        label: "Gemini 2.5 Pro 💡",
        modelName: "gemini-2.5-pro",
        thinkingBudget: -1,
    },
];

export const IMAGE_MODEL_OPTIONS = [
    {
        label: "Nano Banana Pro Preview",
        modelName: "gemini-3-pro-image-preview",
    },
    {
        label: "Nano Banana",
        modelName: "gemini-2.5-flash-image",
    },
];

export const VIDEO_MODEL_OPTIONS = [
    {
        label: "Veo 3.1 Preview Fast 🔈",
        modelName: "veo-3.1-fast-generate-preview",
        generateAudio: true,
    },
    {
        label: "Veo 3.1 Preview Fast",
        modelName: "veo-3.1-fast-generate-preview",
        generateAudio: false,
    },
    {
        label: "Veo 3.1 🔈",
        modelName: "veo-3.1-generate-preview",
        generateAudio: true,
    },
    {
        label: "Veo 3.1",
        modelName: "veo-3.1-generate-preview",
        generateAudio: false,
    },
    {
        label: "Veo 3.0 Fast 🔈",
        modelName: "veo-3.0-fast-generate-001",
        generateAudio: true,
    },
    {
        label: "Veo 3.0 Fast",
        modelName: "veo-3.0-fast-generate-001",
        generateAudio: false,
    },
    {
        label: "Veo 3.0 🔈",
        modelName: "veo-3.0-generate-001",
        generateAudio: true,
    },
    {
        label: "Veo 3.0",
        modelName: "veo-3.0-generate-001",
        generateAudio: false,
    },
];

export interface Settings {
    llmModel: string;
    thinkingBudget: number;
    imageModel: string;
    videoModel: string;
    generateAudio: boolean;
}

const STORAGE_KEY = "storycraft-settings";

const DEFAULT_SETTINGS: Settings = {
    llmModel: "gemini-3-flash-preview",
    thinkingBudget: 0,
    imageModel: "gemini-3-pro-image-preview",
    videoModel: "veo-3.1-fast-generate-preview",
    generateAudio: false,
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
    undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return { ...DEFAULT_SETTINGS, ...parsed };
                } catch (e) {
                    console.error(
                        "Failed to parse settings from localStorage",
                        e,
                    );
                }
            }
        }
        return DEFAULT_SETTINGS;
    });

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings((prev) => {
            const updated = { ...prev, ...newSettings };
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
            return updated;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
