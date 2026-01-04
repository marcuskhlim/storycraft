import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateScenario } from "@/app/features/create/actions/generate-scenario";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";

vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

vi.mock("@/lib/api/gemini", () => ({
    generateContent: vi.fn().mockResolvedValue(
        JSON.stringify({
            scenario: "Test scenario text",
            characters: [{ name: "Hero", description: "A brave knight" }],
            settings: [{ name: "Castle", description: "A grand fortress" }],
            props: [{ name: "Sword", description: "A sharp blade" }],
        }),
    ),
}));

vi.mock("@/app/features/shared/actions/image-generation", () => ({
    generateImageForScenario: vi.fn().mockResolvedValue({
        success: true,
        imageGcsUri: "gs://bucket/mock-image.png",
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

describe("generateScenario integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should call generateImageForScenario for entities", async () => {
        const result = await generateScenario(
            "Test Movie",
            "A story about a knight",
            5,
            "Photographic",
            "16:9",
            8,
            { name: "English", code: "en-US" },
        );

        expect(generateImageForScenario).toHaveBeenCalled();
        // Should be called at least once for characters, settings, and props
        expect(result.characters[0].imageGcsUri).toBe(
            "gs://bucket/mock-image.png",
        );
        expect(result.settings[0].imageGcsUri).toBe(
            "gs://bucket/mock-image.png",
        );
        expect(result.props![0].imageGcsUri).toBe("gs://bucket/mock-image.png");
    });
});
