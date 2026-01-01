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
] as const;

export const IMAGE_MODEL_OPTIONS = [
    {
        label: "Nano Banana Pro Preview",
        modelName: "gemini-3-pro-image-preview",
    },
    {
        label: "Nano Banana",
        modelName: "gemini-2.5-flash-image",
    },
] as const;

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
] as const;

export interface Settings {
    llmModel: string;
    thinkingBudget: number;
    imageModel: string;
    videoModel: string;
    generateAudio: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    llmModel: "gemini-3-flash-preview",
    thinkingBudget: 0,
    imageModel: "gemini-3-pro-image-preview",
    videoModel: "veo-3.1-fast-generate-preview",
    generateAudio: false,
};
