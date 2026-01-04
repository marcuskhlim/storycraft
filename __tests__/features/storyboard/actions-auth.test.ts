import { describe, it, expect, vi, beforeEach } from "vitest";
import { resizeImage, createCollage } from "@/app/features/storyboard/actions/resize-image";
import { saveImageToPublic } from "@/app/features/storyboard/actions/upload-image";
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

describe("Storyboard Actions Authentication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("resizeImage", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(null as any);

            await expect(
                resizeImage("data:image/png;base64,test", 100, 100)
            ).rejects.toThrow("Unauthorized");
        });
    });

    describe("createCollage", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(null as any);

            await expect(
                createCollage([], [], "16:9")
            ).rejects.toThrow("Unauthorized");
        });
    });

    describe("saveImageToPublic", () => {
        it("should throw Unauthorized when user is not authenticated", async () => {
            vi.mocked(auth).mockResolvedValue(null as any);

            await expect(
                saveImageToPublic("data:image/png;base64,test", "test.png")
            ).rejects.toThrow("Unauthorized");
        });
    });
});
