import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import { uploadStyleImageToGCS, getSignedUrlAction } from "@/app/features/shared/actions/storageActions";
import { getDynamicImageUrl, uploadImageToGCS } from "@/app/features/shared/actions/upload-to-gcs";
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

describe("Shared Actions Authentication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("generateImageForScenario should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(generateImageForScenario({} as any)).rejects.toThrow("Unauthorized");
    });

    it("uploadStyleImageToGCS should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(uploadStyleImageToGCS("base64", "file.png")).rejects.toThrow("Unauthorized");
    });

    it("getSignedUrlAction should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(getSignedUrlAction("gs://test")).rejects.toThrow("Unauthorized");
    });

    it("getDynamicImageUrl should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(getDynamicImageUrl("gs://test")).rejects.toThrow("Unauthorized");
    });

    it("uploadImageToGCS should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(uploadImageToGCS("base64")).rejects.toThrow("Unauthorized");
    });
});
