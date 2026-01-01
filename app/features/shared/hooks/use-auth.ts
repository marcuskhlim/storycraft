import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useCreateUserMutation } from "./use-auth-query";

export function useAuth() {
    const { data: session, status } = useSession();
    const createUserMutation = useCreateUserMutation();

    useEffect(() => {
        // When user is authenticated, ensure they exist in Firestore
        if (status === "authenticated" && session?.user?.id) {
            createUserMutation.mutate();
        }
    }, [status, session?.user?.id, createUserMutation]);

    return { session, status };
}
