import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useCreateUserMutation } from "./use-auth-query";

export function useAuth() {
    const { data: session, status } = useSession();
    return { session, status };
}

export function useAuthSync() {
    const { data: session, status } = useSession();
    const { mutate } = useCreateUserMutation();
    const hasCreatedUser = useRef(false);

    useEffect(() => {
        // When user is authenticated, ensure they exist in Firestore
        // Only run once per session/mount
        if (
            status === "authenticated" &&
            session?.user?.id &&
            !hasCreatedUser.current
        ) {
            hasCreatedUser.current = true;
            mutate();
        }
    }, [status, session?.user?.id, mutate]);
}
