import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";

// Save or update timeline state
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = session.user.id;
        const { scenarioId, layers } = await request.json();

        if (!scenarioId || !layers) {
            return NextResponse.json(
                { error: "scenarioId and layers are required" },
                { status: 400 },
            );
        }

        // Use scenarioId as the timeline document ID (1:1 relationship)
        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const existingDoc = await timelineRef.get();

        const timelineData = {
            id: scenarioId,
            scenarioId,
            userId,
            layers,
            updatedAt: Timestamp.now(),
        };

        if (existingDoc.exists) {
            // Verify ownership before updating
            const existingData = existingDoc.data();
            if (existingData?.userId !== userId) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 403 },
                );
            }
            await timelineRef.update(timelineData);
        } else {
            await timelineRef.set({
                ...timelineData,
                createdAt: Timestamp.now(),
            });
        }

        return NextResponse.json({ success: true, timelineId: scenarioId });
    } catch (error) {
        console.error("Error saving timeline:", error);
        return NextResponse.json(
            { error: "Failed to save timeline" },
            { status: 500 },
        );
    }
}

// Load timeline state
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const scenarioId = searchParams.get("scenarioId");

        if (!scenarioId) {
            return NextResponse.json(
                { error: "scenarioId is required" },
                { status: 400 },
            );
        }

        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const timelineDoc = await timelineRef.get();

        if (!timelineDoc.exists) {
            return NextResponse.json({ timeline: null });
        }

        const data = timelineDoc.data();

        // Verify ownership
        if (data?.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 },
            );
        }

        return NextResponse.json({ timeline: data });
    } catch (error) {
        console.error("Error loading timeline:", error);
        return NextResponse.json(
            { error: "Failed to load timeline" },
            { status: 500 },
        );
    }
}

// Delete timeline (reset to scenario defaults)
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const scenarioId = searchParams.get("scenarioId");

        if (!scenarioId) {
            return NextResponse.json(
                { error: "scenarioId is required" },
                { status: 400 },
            );
        }

        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const timelineDoc = await timelineRef.get();

        if (timelineDoc.exists) {
            const data = timelineDoc.data();

            // Verify ownership before deleting
            if (data?.userId !== session.user.id) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 403 },
                );
            }

            await timelineRef.delete();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting timeline:", error);
        return NextResponse.json(
            { error: "Failed to delete timeline" },
            { status: 500 },
        );
    }
}
