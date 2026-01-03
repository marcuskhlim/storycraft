import React, { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useScenarios } from "@/app/features/scenario/hooks/use-scenarios-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                retryDelay: 0,
            },
        },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    wrapper.displayName = "QueryClientWrapper";
    return wrapper;
};

describe("useScenarios", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should fetch scenarios successfully", async () => {
        const mockScenarios = [{ id: "1", name: "Scenario 1" }];
        const mockResponse = {
            success: true,
            data: { scenarios: mockScenarios },
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        } as Response);

        const { result } = renderHook(() => useScenarios(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockScenarios);
        expect(global.fetch).toHaveBeenCalledWith("/api/scenarios");
    });

    it("should handle fetch error", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        } as Response);

        const { result } = renderHook(() => useScenarios(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true), {
            timeout: 5000,
        });
        expect(result.current.error?.message).toBe("Failed to fetch scenarios");
    });
});
