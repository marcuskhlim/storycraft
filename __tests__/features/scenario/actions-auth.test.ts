import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateStoryboard } from "@/app/features/scenario/actions/generate-scenes";
import { deleteCharacterFromScenario } from "@/app/features/scenario/actions/modify-scenario";
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

describe("Scenario Actions Authentication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateStoryboard", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(
                null as unknown as Awaited<ReturnType<typeof auth>>,
            );

            await expect(
                generateStoryboard(
                    { scenario: "test", scenes: [] } as never,
                    1,
                    "style",
                    { name: "English", code: "en" },
                ),
            ).rejects.toThrow("Unauthorized");
        });
    });

    describe("deleteCharacterFromScenario", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(
                null as unknown as Awaited<ReturnType<typeof auth>>,
            );

            await expect(
                deleteCharacterFromScenario("scenario", "char", "desc"),
            ).rejects.toThrow("Unauthorized");
        });
    });
});
