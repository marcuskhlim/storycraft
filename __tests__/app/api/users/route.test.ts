import { GET, POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { firestore } from "@/lib/storage/firestore";
import { vi, describe, it, expect, beforeEach, Mock } from "vitest";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("@/lib/storage/firestore", () => ({
    firestore: {
        collection: vi.fn(),
        runTransaction: vi.fn(),
    },
}));

vi.mock("@/app/logger", () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

const mockedAuth = auth as unknown as Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedFirestore = firestore as any;

describe("Users API Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET", () => {
        it("should return 401 if unauthorized", async () => {
            mockedAuth.mockResolvedValue(null);
            const req = new NextRequest("http://localhost/api/users");
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it("should return user data if exists", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockDoc = {
                exists: true,
                data: () => ({ displayName: "Test User" }),
            };
            const mockGet = vi.fn().mockResolvedValue(mockDoc);
            mockedFirestore.collection.mockReturnValue({
                doc: vi.fn().mockReturnValue({ get: mockGet }),
            });

            const req = new NextRequest("http://localhost/api/users");
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.data.displayName).toBe("Test User");
        });

        it("should return 404 if user not found", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockDoc = { exists: false };
            const mockGet = vi.fn().mockResolvedValue(mockDoc);
            mockedFirestore.collection.mockReturnValue({
                doc: vi.fn().mockReturnValue({ get: mockGet }),
            });

            const req = new NextRequest("http://localhost/api/users");
            const res = await GET(req);
            expect(res.status).toBe(404);
        });
    });

    describe("POST", () => {
        it("should create or update user", async () => {
            mockedAuth.mockResolvedValue({
                user: {
                    id: "user123",
                    email: "test@example.com",
                    name: "Test",
                },
                expires: "",
            });

            mockedFirestore.collection.mockReturnValue({
                doc: vi.fn().mockReturnValue({ id: "user123" }),
            });

            mockedFirestore.runTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                async (cb: (transaction: any) => Promise<any>) => {
                    return await cb({
                        get: vi.fn().mockResolvedValue({ exists: false }),
                        set: vi.fn(),
                        update: vi.fn(),
                    });
                },
            );

            const req = new NextRequest("http://localhost/api/users", {
                method: "POST",
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.data.email).toBe("test@example.com");
        });
    });
});
