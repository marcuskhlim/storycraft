import { describe, it, expect } from "vitest";
import { imagePromptToString } from "@/lib/utils/prompt-utils";
import { ImagePrompt } from "@/app/types";

describe("imagePromptToString", () => {
    it("should format image prompt correctly as YAML", () => {
        const prompt: ImagePrompt = {
            Style: "Photographic",
            Scene: "A busy city street at night",
            Composition: {
                shot_type: "Wide Shot",
                lighting: "Neon lights",
                overall_mood: "Cyberpunk",
            },
            Subject: [
                {
                    name: "Hero",
                    description: "A mysterious figure in a trench coat",
                },
            ],
            Prop: [
                {
                    name: "Briefcase",
                    description: "Metallic briefcase handcuffed to the hero",
                },
            ],
            Context: [
                {
                    name: "Rain",
                    description: "Soft drizzle reflecting on the pavement",
                },
            ],
        };

        const result = imagePromptToString(prompt);

        expect(result).toContain("Style: Photographic");
        expect(result).toContain("Scene: A busy city street at night");
        expect(result).toContain("shot_type: Wide Shot");
        expect(result).toContain("name: Hero");
        expect(result).toContain("name: Rain");
    });
});
