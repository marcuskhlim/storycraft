import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateScenario } from "@/app/features/create/actions/generate-scenario";

vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

// Mock the AI APIs
vi.mock("@/lib/api/gemini", () => ({
    generateContent: vi.fn().mockResolvedValue(
        JSON.stringify({
            scenario: "Test scenario text",
            characters: [{ name: "Hero", description: "A brave knight" }],
            settings: [{ name: "Castle", description: "A grand fortress" }],
            props: [{ name: "Sword", description: "A sharp blade" }],
        }),
    ),
    generateImage: vi.fn().mockResolvedValue({
        success: true,
        imageGcsUri: "gs://bucket/test-image.png",
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

describe("generateScenario", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate a complete scenario structure", async () => {
        const result = await generateScenario(
            "Test Movie",
            "A story about a knight",
            5,
            "Photographic",
            "16:9",
            8,
            { name: "English", code: "en-US" },
        );

        expect(result.name).toBe("Test Movie");
        expect(result.characters).toHaveLength(1);
        expect(result.characters[0].imageGcsUri).toBe(
            "gs://bucket/test-image.png",
        );
        expect(result.settings[0].imageGcsUri).toBe(
            "gs://bucket/test-image.png",
        );
    });

    it("should fail if validation fails (empty name)", async () => {
        await expect(
            generateScenario(
                "", // Empty name
                "A story",
                5,
                "Photographic",
                "16:9",
                8,
                { name: "English", code: "en-US" },
            ),
        ).rejects.toThrow();
    });
});
