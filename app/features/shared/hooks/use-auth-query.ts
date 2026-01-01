import { useMutation } from "@tanstack/react-query";
import { clientLogger } from "@/lib/utils/client-logger";

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

            return await response.json();
        },
        onError: (error) => {
            clientLogger.error("Error creating/updating user:", error);
        },
    });
}
