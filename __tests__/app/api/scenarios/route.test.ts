import { GET, POST, DELETE } from "@/app/api/scenarios/route";
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

describe("Scenarios API Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET", () => {
        it("should return 401 if unauthorized", async () => {
            mockedAuth.mockResolvedValue(null);
            const req = new NextRequest("http://localhost/api/scenarios");
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it("should return all scenarios for user when no ID provided", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockDocs = [
                { id: "s1", data: () => ({ name: "Scenario 1" }) },
                { id: "s2", data: () => ({ name: "Scenario 2" }) },
            ];

            const mockGet = vi.fn().mockResolvedValue({ docs: mockDocs });
            const mockOrderBy = vi.fn().mockReturnValue({ get: mockGet });
            const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });

            mockedFirestore.collection.mockReturnValue({
                where: mockWhere,
            });

            const req = new NextRequest("http://localhost/api/scenarios");
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.scenarios).toHaveLength(2);
            expect(firestore.collection).toHaveBeenCalledWith("scenarios");
            expect(mockWhere).toHaveBeenCalledWith("userId", "==", "user123");
        });

        it("should return a specific scenario when ID provided", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockDoc = { id: "s1", data: () => ({ name: "Scenario 1" }) };
            const mockGet = vi.fn().mockResolvedValue({
                empty: false,
                docs: [mockDoc],
            });
            const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
            const mockWhere2 = vi.fn().mockReturnValue({ limit: mockLimit });
            const mockWhere1 = vi.fn().mockReturnValue({ where: mockWhere2 });

            mockedFirestore.collection.mockReturnValue({
                where: mockWhere1,
            });

            const req = new NextRequest("http://localhost/api/scenarios?id=s1");
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.data.id).toBe("s1");
            expect(data.data.name).toBe("Scenario 1");
        });

        it("should return 404 if scenario not found", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockGet = vi.fn().mockResolvedValue({
                empty: true,
            });
            const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
            const mockWhere2 = vi.fn().mockReturnValue({ limit: mockLimit });
            const mockWhere1 = vi.fn().mockReturnValue({ where: mockWhere2 });

            mockedFirestore.collection.mockReturnValue({
                where: mockWhere1,
            });

            const req = new NextRequest("http://localhost/api/scenarios?id=s1");
            const res = await GET(req);
            expect(res.status).toBe(404);
        });
    });

    describe("POST", () => {
        it("should create a new scenario successfully", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockBody = {
                scenario: {
                    name: "New Scenario",
                    pitch: "A new story",
                    scenario: "Full scenario text",
                    style: "Photographic",
                    aspectRatio: "16:9",
                    durationSeconds: 10,
                    genre: "Drama",
                    mood: "Serious",
                    music: "None",
                    language: { name: "English", code: "en" },
                    characters: [],
                    settings: [],
                    props: [],
                    scenes: [],
                },
            };

            const mockDocId = "new-id";
            const mockDoc = { id: mockDocId };
            const mockCollection = {
                doc: vi.fn().mockReturnValue(mockDoc),
            };
            mockedFirestore.collection.mockReturnValue(mockCollection);

            mockedFirestore.runTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                async (cb: (transaction: any) => Promise<void>) => {
                    await cb({
                        get: vi.fn().mockResolvedValue({ exists: false }),
                        set: vi.fn(),
                        update: vi.fn(),
                    });
                },
            );

            const req = new NextRequest("http://localhost/api/scenarios", {
                method: "POST",
                body: JSON.stringify(mockBody),
            });
            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.data.scenarioId).toBe(mockDocId);
        });

        it("should return 403 if trying to update someone else's scenario", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockBody = {
                scenario: {
                    name: "Update",
                    pitch: "A new story",
                    scenario: "Full scenario text",
                    style: "Photographic",
                    aspectRatio: "16:9",
                    durationSeconds: 10,
                    genre: "Drama",
                    mood: "Serious",
                    music: "None",
                    language: { name: "English", code: "en" },
                    characters: [],
                    settings: [],
                    props: [],
                    scenes: [],
                },
                scenarioId: "s1",
            };

            const mockCollection = {
                doc: vi.fn().mockReturnValue({ id: "s1" }),
            };
            mockedFirestore.collection.mockReturnValue(mockCollection);

            mockedFirestore.runTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                async (cb: (transaction: any) => Promise<void>) => {
                    await cb({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ userId: "otherUser" }),
                        }),
                    });
                },
            );

            const req = new NextRequest("http://localhost/api/scenarios", {
                method: "POST",
                body: JSON.stringify(mockBody),
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
        });
    });

    describe("DELETE", () => {
        it("should delete scenario successfully", async () => {
            mockedAuth.mockResolvedValue({
                user: { id: "user123" },
                expires: "",
            });

            const mockCollection = {
                doc: vi.fn().mockReturnValue({ id: "s1" }),
            };
            mockedFirestore.collection.mockReturnValue(mockCollection);

            mockedFirestore.runTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                async (cb: (transaction: any) => Promise<void>) => {
                    await cb({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ userId: "user123" }),
                        }),
                        delete: vi.fn(),
                    });
                },
            );

            const req = new NextRequest(
                "http://localhost/api/scenarios?id=s1",
                {
                    method: "DELETE",
                },
            );
            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
        });
    });
});
