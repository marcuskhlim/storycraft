import { describe, it, expect, vi, beforeEach } from "vitest";
import { conversationalEdit } from "@/app/features/editor/actions/conversational-edit";
import { generateMusic } from "@/app/features/editor/actions/generate-music";
import { exportMovieAction } from "@/app/features/editor/actions/generate-video";
import { generateVoiceover } from "@/app/features/editor/actions/generate-voiceover";
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

describe("Editor Actions Authentication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("conversationalEdit should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(conversationalEdit({} as any)).rejects.toThrow("Unauthorized");
    });

    it("generateMusic should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(generateMusic("prompt")).rejects.toThrow("Unauthorized");
    });

    it("exportMovieAction should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(exportMovieAction([])).rejects.toThrow("Unauthorized");
    });

    it("generateVoiceover should throw Unauthorized when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);
        await expect(generateVoiceover([], {} as any)).rejects.toThrow("Unauthorized");
    });
});
