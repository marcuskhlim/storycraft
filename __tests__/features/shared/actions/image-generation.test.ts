import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import { Scenario, ImagePrompt } from "@/app/types";

vi.mock("@/lib/api/gemini", () => ({
    generateImage: vi.fn(),
    createPartFromText: (text: string) => ({ text }),
    createPartFromUri: (uri: string, mime: string) => ({
        fileData: { fileUri: uri, mimeType: mime },
    }),
}));

vi.mock("@/app/features/storyboard/actions/resize-image", () => ({
    createCollage: vi.fn().mockResolvedValue("gs://bucket/collage.png"),
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

describe("generateImageForScenario", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate an image for a character entity", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/char.png",
        });

        const result = await generateImageForScenario({
            scenario: mockScenario,
            entity: mockScenario.characters[0],
            entityType: "character",
        });

        expect(result.success).toBe(true);
        expect(result.imageGcsUri).toBe("gs://bucket/char.png");
        expect(generateImage).toHaveBeenCalled();
    });

    it("should generate an image for a scene with R2I", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/scene.png",
        });

        const imagePrompt: ImagePrompt = {
            Style: "Photographic",
            Scene: "In the forest",
            Composition: {
                shot_type: "Wide Shot",
                lighting: "Natural",
                overall_mood: "Calm",
            },
            Subject: [{ name: "Hero" }],
            Context: [{ name: "Forest" }],
            Prop: [],
        };

        const result = await generateImageForScenario({
            scenario: mockScenario,
            imagePrompt,
        });

        expect(result.success).toBe(true);
        expect(result.imageGcsUri).toBe("gs://bucket/scene.png");
        // Verify R2I was used (parts should include hero.png)
        const callArgs = (generateImage as Mock).mock.calls[0][0];
        expect(JSON.stringify(callArgs)).toContain("gs://bucket/hero.png");
    });

    it("should use collage when too many references", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/scene.png",
        });

        // Add more characters to trigger collage (limit is 14 in existing code, but let's say 4 for testing if we make it configurable or just use 15)
        const manyCharacters = Array.from({ length: 15 }, (_, i) => ({
            name: `Char ${i}`,
            description: `Desc ${i}`,
            imageGcsUri: `gs://bucket/char${i}.png`,
        }));

        const scenarioWithManyChars = {
            ...mockScenario,
            characters: manyCharacters,
        };

        const imagePrompt: ImagePrompt = {
            Style: "Photographic",
            Scene: "Crowded scene",
            Composition: {
                shot_type: "Wide Shot",
                lighting: "Natural",
                overall_mood: "Calm",
            },
            Subject: manyCharacters.map((c) => ({ name: c.name })),
            Context: [],
            Prop: [],
        };

        await generateImageForScenario({
            scenario: scenarioWithManyChars,
            imagePrompt,
        });

        const { createCollage } =
            await import("@/app/features/storyboard/actions/resize-image");
        expect(createCollage).toHaveBeenCalled();
        const callArgs = (generateImage as Mock).mock.calls[0][0];
        expect(JSON.stringify(callArgs)).toContain("gs://bucket/collage.png");
    });

    it("should use styleImageUri when provided in scenario", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/scene.png",
        });

        const scenarioWithStyle = {
            ...mockScenario,
            styleImageUri: "gs://bucket/style.png",
        };

        await generateImageForScenario({
            scenario: scenarioWithStyle,
            entity: mockScenario.characters[0],
            entityType: "character",
        });

        const callArgs = (generateImage as Mock).mock.calls[0][0];
        expect(JSON.stringify(callArgs)).toContain("gs://bucket/style.png");
        expect(JSON.stringify(callArgs)).toContain("Reference Strength");
    });

    it("should filter characters, props and settings based on imagePrompt", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/scene.png",
        });

        const scenarioWithMore: Scenario = {
            ...mockScenario,
            characters: [
                {
                    name: "Hero",
                    description: "Brave hero",
                    imageGcsUri: "gs://bucket/hero.png",
                },
                {
                    name: "Villain",
                    description: "Evil villain",
                    imageGcsUri: "gs://bucket/villain.png",
                },
            ],
            settings: [
                { name: "Forest", description: "Dark forest" },
                { name: "Castle", description: "Cold castle" },
            ],
            props: [
                {
                    name: "Sword",
                    description: "Sharp sword",
                    imageGcsUri: "gs://bucket/sword.png",
                },
            ],
        };

        const imagePrompt: ImagePrompt = {
            Style: "Photographic",
            Scene: "Confrontation",
            Composition: {
                shot_type: "Medium Shot",
                lighting: "Dramatic",
                overall_mood: "Tense",
            },
            Subject: [{ name: "Hero" }], // Villain is NOT present
            Context: [{ name: "Castle" }], // Forest is NOT present
            Prop: [{ name: "Sword" }],
        };

        await generateImageForScenario({
            scenario: scenarioWithMore,
            imagePrompt,
        });

        const callArgs = (generateImage as Mock).mock.calls[0][0];
        const callArgsString = JSON.stringify(callArgs);

        expect(callArgsString).toContain("gs://bucket/hero.png");
        expect(callArgsString).toContain("gs://bucket/sword.png");
        expect(callArgsString).toContain("Cold castle");

        expect(callArgsString).not.toContain("gs://bucket/villain.png");
        expect(callArgsString).not.toContain("Dark forest");
    });

    it("should support conversational edit with instruction and imageGcsUri", async () => {
        const { generateImage } = await import("@/lib/api/gemini");
        (generateImage as Mock).mockResolvedValue({
            success: true,
            imageGcsUri: "gs://bucket/edited.png",
        });

        const result = await generateImageForScenario({
            scenario: mockScenario,
            instruction: "Make it more dramatic",
            imageGcsUri: "gs://bucket/original.png",
        });

        expect(result.success).toBe(true);
        expect(result.imageGcsUri).toBe("gs://bucket/edited.png");

        const callArgs = (generateImage as Mock).mock.calls[0][0];
        const callArgsString = JSON.stringify(callArgs);
        expect(callArgsString).toContain("gs://bucket/original.png");
        expect(callArgsString).toContain("Make it more dramatic");
    });
});
