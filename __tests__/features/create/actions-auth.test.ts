import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateScenario } from "@/app/features/create/actions/generate-scenario";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

// Mock logger to avoid noise
vi.mock("@/app/logger", () => ({
    default: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("Create Actions Authentication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateScenario", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(null as any);

            await expect(
                generateScenario("name", "pitch", 1, "style", "16:9", 60, {
                    name: "English",
                    code: "en",
                }),
            ).rejects.toThrow("Unauthorized");
        });
    });
});
