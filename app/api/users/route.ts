import { firestore } from "@/lib/storage/firestore";
import type { FirestoreUser } from "@/types/firestore";
import logger from "@/app/logger";
import {
    successResponse,
    errorResponse,
    notFoundResponse,
} from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const POST = withAuth(async (request, { session, userId }) => {
    try {
        if (!session.user?.email) {
            return errorResponse(
                "User email is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const userEmail = session.user.email;
        const displayName = session.user.name || userEmail.split("@")[0];
        const photoURL = session.user.image || "";

        const userRef = firestore.collection("users").doc(userId);

        // Use a transaction to manage user data
        const result = await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists) {
                // User exists, update their information
                transaction.update(userRef, {
                    displayName,
                    photoURL,
                    // Don't update createdAt
                });

                return {
                    id: userId,
                    ...userDoc.data(),
                    displayName,
                    photoURL,
                };
            } else {
                // Create new user
                const newUser: FirestoreUser = {
                    email: userEmail,
                    displayName,
                    photoURL,
                    createdAt: new Date(),
                };

                transaction.set(userRef, newUser);

                return {
                    id: userId,
                    ...newUser,
                };
            }
        });

        return successResponse(result);
    } catch (error) {
        logger.error(`Error managing user: ${error}`);
        return errorResponse("Failed to manage user", "USER_MANAGEMENT_ERROR");
    }
});

export const GET = withAuth(async (request, { userId }) => {
    try {
        const userRef = firestore.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return notFoundResponse("User not found");
        }

        return successResponse({
            id: userId,
            ...userDoc.data(),
        });
    } catch (error) {
        logger.error(`Error fetching user: ${error}`);
        return errorResponse("Failed to fetch user", "FETCH_USER_ERROR");
    }
});
