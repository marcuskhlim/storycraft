import { useMutation } from "@tanstack/react-query";
import { clientLogger } from "@/lib/utils/client-logger";
import { ApiResponse } from "@/types/api";

export function useCreateUserMutation() {
    return useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to create/update user");
            }

            const result = (await response.json()) as ApiResponse<unknown>;
            if (!result.success) {
                throw new Error(
                    result.error?.message || "Failed to create/update user",
                );
            }
            return result.data;
        },
        onError: (error) => {
            clientLogger.error("Error creating/updating user:", error);
        },
    });
}
