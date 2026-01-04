import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateStoryboard } from "@/app/features/scenario/actions/generate-scenes";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import { Scenario } from "@/app/types";

vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

vi.mock("@/lib/api/gemini", () => ({
    generateContent: vi.fn().mockResolvedValue(
        JSON.stringify({
            scenes: [
                {
                    description: "Test scene",
                    imagePrompt: {
                        Style: "Photographic",
                        Scene: "A test scene",
                        Composition: {
                            shot_type: "Wide Shot",
                            lighting: "Natural",
                            overall_mood: "Calm",
                        },
                        Subject: [{ name: "Hero" }],
                        Context: [{ name: "Forest" }],
                        Prop: [],
                    },
                    videoPrompt: {
                        Action: "Walking",
                        Camera_Motion: "Pan",
                        Ambiance_Audio: "Birds",
                    },
                    voiceover: "He walks.",
                    charactersPresent: ["Hero"],
                },
            ],
        }),
    ),
}));

vi.mock("@/app/features/shared/actions/image-generation", () => ({
    generateImageForScenario: vi.fn().mockResolvedValue({
        success: true,
        imageGcsUri: "gs://bucket/mock-scene-image.png",
    }),
}));

vi.mock("@/app/logger", () => ({
    default: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const mockScenario: Scenario = {
    name: "Test Scenario",
    pitch: "Test Pitch",
    scenario: "Test Scenario Content",
    style: "Photographic",
    aspectRatio: "16:9",
    durationSeconds: 10,
    genre: "Action",
    mood: "Exciting",
    music: "Epic",
    language: { name: "English", code: "en-US" },
    characters: [
        {
            name: "Hero",
            description: "Brave hero",
            imageGcsUri: "gs://bucket/hero.png",
        },
    ],
    settings: [{ name: "Forest", description: "Dark forest" }],
    props: [],
    scenes: [],
};

describe("generateStoryboard integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should call generateImageForScenario for scenes", async () => {
        const result = await generateStoryboard(
            mockScenario,
            1,
            "Photographic",
            { name: "English", code: "en-US" },
        );

        expect(generateImageForScenario).toHaveBeenCalled();
        expect(result.scenes[0].imageGcsUri).toBe(
            "gs://bucket/mock-scene-image.png",
        );
    });
});
