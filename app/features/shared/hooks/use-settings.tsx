"use client";
import React, { createContext, useContext, useState } from "react";
import {
    LLM_OPTIONS,
    IMAGE_MODEL_OPTIONS,
    VIDEO_MODEL_OPTIONS,
    DEFAULT_SETTINGS,
    type Settings,
} from "@/lib/ai-config";

export { LLM_OPTIONS, IMAGE_MODEL_OPTIONS, VIDEO_MODEL_OPTIONS, type Settings };

const STORAGE_KEY = "storycraft-settings";

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
