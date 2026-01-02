import { NextResponse } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";
import type { FirestoreUser } from "@/types/firestore";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
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
            return NextResponse.json({
                success: true,
                data: {
                    id: userId,
                    ...updatedUserData.data(),
                },
                meta: { timestamp: new Date().toISOString() },
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

            return NextResponse.json({
                success: true,
                data: {
                    id: userId,
                    ...newUser,
                },
                meta: { timestamp: new Date().toISOString() },
            });
        }
    } catch (error) {
        console.error("Error managing user:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "USER_MANAGEMENT_ERROR",
                    message: "Failed to manage user",
                },
            },
            { status: 500 },
        );
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = session.user.id;
        const userRef = firestore.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: "User not found",
                    },
                },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: userId,
                ...userDoc.data(),
            },
            meta: { timestamp: new Date().toISOString() },
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "FETCH_USER_ERROR",
                    message: "Failed to fetch user",
                },
            },
            { status: 500 },
        );
    }
}
