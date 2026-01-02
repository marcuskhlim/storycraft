import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";
import { timelineLayerSchema } from "@/app/schemas";
import { z } from "zod";

const postSchema = z.object({
    scenarioId: z.string().min(1),
    layers: z.array(timelineLayerSchema),
});

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
        const body = await request.json();

        // Validate request body
        const parseResult = postSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request body",
                        details: parseResult.error.format(),
                    },
                    meta: { timestamp: new Date().toISOString() },
                },
                { status: 400 },
            );
        }

        const { scenarioId, layers } = parseResult.data;

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

        return NextResponse.json({
            success: true,
            data: { timelineId: scenarioId },
            meta: { timestamp: new Date().toISOString() },
        });
    } catch (error) {
        console.error("Error saving timeline:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "SAVE_TIMELINE_ERROR",
                    message: "Failed to save timeline",
                },
            },
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
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return NextResponse.json(
                { error: "scenarioId is required" },
                { status: 400 },
            );
        }

        const idResult = z.string().min(1).safeParse(scenarioIdParam);
        if (!idResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid scenarioId",
                        details: idResult.error.format(),
                    },
                    meta: { timestamp: new Date().toISOString() },
                },
                { status: 400 },
            );
        }
        const scenarioId = idResult.data;

        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const timelineDoc = await timelineRef.get();

        if (!timelineDoc.exists) {
            return NextResponse.json({
                success: true,
                data: { timeline: null },
                meta: { timestamp: new Date().toISOString() },
            });
        }

        const data = timelineDoc.data();

        // Verify ownership
        if (data?.userId !== session.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Unauthorized",
                    },
                },
                { status: 403 },
            );
        }

        return NextResponse.json({
            success: true,
            data: { timeline: data },
            meta: { timestamp: new Date().toISOString() },
        });
    } catch (error) {
        console.error("Error loading timeline:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "LOAD_TIMELINE_ERROR",
                    message: "Failed to load timeline",
                },
            },
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
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return NextResponse.json(
                { error: "scenarioId is required" },
                { status: 400 },
            );
        }

        const idResult = z.string().min(1).safeParse(scenarioIdParam);
        if (!idResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid scenarioId",
                        details: idResult.error.format(),
                    },
                    meta: { timestamp: new Date().toISOString() },
                },
                { status: 400 },
            );
        }
        const scenarioId = idResult.data;

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

        return NextResponse.json({
            success: true,
            data: { success: true },
            meta: { timestamp: new Date().toISOString() },
        });
    } catch (error) {
        console.error("Error deleting timeline:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "DELETE_TIMELINE_ERROR",
                    message: "Failed to delete timeline",
                },
            },
            { status: 500 },
        );
    }
}
