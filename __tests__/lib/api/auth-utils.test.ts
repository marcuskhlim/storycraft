import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/api/auth-utils";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

describe("requireAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return session when user is authenticated", async () => {
        const mockSession = { user: { id: "user-123", email: "test@example.com" } };
        vi.mocked(auth).mockResolvedValue(mockSession as any);

        const session = await requireAuth();

        expect(session).toEqual(mockSession);
        expect(auth).toHaveBeenCalledTimes(1);
    });

    it("should throw an error when user is not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null as any);

        await expect(requireAuth()).rejects.toThrow("Unauthorized");
        expect(auth).toHaveBeenCalledTimes(1);
    });

    it("should throw an error when session exists but user is missing", async () => {
        vi.mocked(auth).mockResolvedValue({} as any);

        await expect(requireAuth()).rejects.toThrow("Unauthorized");
        expect(auth).toHaveBeenCalledTimes(1);
    });
});
