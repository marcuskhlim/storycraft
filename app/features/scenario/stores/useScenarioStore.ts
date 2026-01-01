import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Scenario, Language } from "@/app/types";

const DEFAULT_LANGUAGE: Language = {
    name: "English (United States)",
    code: "en-US",
};

interface ScenarioState {
    // Session state
    currentScenarioId: string | null;
    isScenarioLoading: boolean;

    // Form fields
    pitch: string;
    name: string;
    style: string;
    aspectRatio: string;
    durationSeconds: number;
    language: Language;
    styleImageUri: string | null;
    logoOverlay: string | null;
    numScenes: number;
    withVoiceOver: boolean;

    // Result
    scenario: Scenario | undefined;
    errorMessage: string | null;
    videoUri: string | null;
    vttUri: string | null;

    // Actions
    setField: <K extends keyof ScenarioState>(
        field: K,
        value: ScenarioState[K],
    ) => void;
    setScenario: (scenario: Scenario | undefined) => void;
    setErrorMessage: (message: string | null) => void;
    setVideoUri: (uri: string | null) => void;
    setVttUri: (uri: string | null) => void;
    reset: () => void;
}

const initialState = {
    currentScenarioId: null,
    isScenarioLoading: false,
    pitch: "",
    name: "",
    style: "Photographic",
    aspectRatio: "16:9",
    durationSeconds: 8,
    language: DEFAULT_LANGUAGE,
    styleImageUri: null,
    logoOverlay: null,
    numScenes: 6,
    withVoiceOver: false,
    scenario: undefined,
    errorMessage: null,
    videoUri: null,
    vttUri: null,
};

export const useScenarioStore = create<ScenarioState>()(
    devtools((set) => ({
        ...initialState,

        setField: (field, value) =>
            set(
                (state) => ({ ...state, [field]: value }),
                false,
                `set_${field}`,
            ),

        setScenario: (scenario) => set({ scenario }, false, "setScenario"),

        setErrorMessage: (errorMessage) =>
            set({ errorMessage }, false, "setErrorMessage"),

        setVideoUri: (videoUri) => set({ videoUri }, false, "setVideoUri"),

        setVttUri: (vttUri) => set({ vttUri }, false, "setVttUri"),

        reset: () => set(initialState, false, "reset"),
    })),
);
