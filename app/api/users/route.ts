import { NextResponse } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";
import type { FirestoreUser } from "@/types/firestore";
import { 
    successResponse, 
    unauthorizedResponse, 
    errorResponse, 
    notFoundResponse 
} from "@/lib/api/response";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const displayName = session.user.name || userEmail.split("@")[0];
        const photoURL = session.user.image || "";

        // Check if user already exists
        const userRef = firestore.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            // User exists, update their information
            await userRef.update({
                displayName,
                photoURL,
                // Don't update createdAt
            });

            const updatedUserData = await userRef.get();
            return successResponse({
                id: userId,
                ...updatedUserData.data(),
            });
        } else {
            // Create new user
            const newUser: FirestoreUser = {
                email: userEmail,
                displayName,
                photoURL,
                createdAt: Timestamp.now(),
            };

            await userRef.set(newUser);

            return successResponse({
                id: userId,
                ...newUser,
            });
        }
    } catch (error) {
        console.error("Error managing user:", error);
        return errorResponse("Failed to manage user", "USER_MANAGEMENT_ERROR");
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
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
        console.error("Error fetching user:", error);
        return errorResponse("Failed to fetch user", "FETCH_USER_ERROR");
    }
}
