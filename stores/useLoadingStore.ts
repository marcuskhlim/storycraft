import { create } from "zustand";

interface LoadingState {
    scenario: boolean;
    storyboard: boolean;
    video: boolean;
    export: boolean;
    uploading: boolean;
    scenes: Set<number>;
    characters: Set<number>;
    settings: Set<number>;
    props: Set<number>;

    // Actions
    setLoading: (
        category: keyof Omit<
            LoadingState,
            | "scenes"
            | "characters"
            | "settings"
            | "props"
            | "setLoading"
            | "startLoading"
            | "stopLoading"
            | "isAnythingLoading"
        >,
        value: boolean,
    ) => void;
    startLoading: (
        category: "scenes" | "characters" | "settings" | "props",
        index: number,
    ) => void;
    stopLoading: (
        category: "scenes" | "characters" | "settings" | "props",
        index: number,
    ) => void;
    isAnythingLoading: () => boolean;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
    scenario: false,
    storyboard: false,
    video: false,
    export: false,
    uploading: false,
    scenes: new Set(),
    characters: new Set(),
    settings: new Set(),
    props: new Set(),

    setLoading: (category, value) =>
        set((state) => ({ ...state, [category]: value })),

    startLoading: (category, index) =>
        set((state) => {
            const nextSet = new Set(state[category]);
            nextSet.add(index);
            return { [category]: nextSet };
        }),

    stopLoading: (category, index) =>
        set((state) => {
            const nextSet = new Set(state[category]);
            nextSet.delete(index);
            return { [category]: nextSet };
        }),

    isAnythingLoading: () => {
        const state = get();
        return (
            state.scenario ||
            state.storyboard ||
            state.video ||
            state.export ||
            state.uploading ||
            state.scenes.size > 0 ||
            state.characters.size > 0 ||
            state.settings.size > 0 ||
            state.props.size > 0
        );
    },
}));
