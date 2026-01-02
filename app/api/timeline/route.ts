import { NextRequest } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";
import { timelineLayerSchema } from "@/app/schemas";
import { z } from "zod";
import logger from "@/app/logger";
import {
    successResponse,
    unauthorizedResponse,
    forbiddenResponse,
    errorResponse,
    validationErrorResponse,
} from "@/lib/api/response";

const postSchema = z.object({
    scenarioId: z.string().min(1),
    layers: z.array(timelineLayerSchema),
});

// Save or update timeline state
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
        const body = await request.json();

        // Validate request body
        const parseResult = postSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
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
                return forbiddenResponse();
            }
            await timelineRef.update(timelineData);
        } else {
            await timelineRef.set({
                ...timelineData,
                createdAt: Timestamp.now(),
            });
        }

        return successResponse({ timelineId: scenarioId });
    } catch (error) {
        logger.error(`Error saving timeline: ${error}`);
        return errorResponse("Failed to save timeline", "SAVE_TIMELINE_ERROR");
    }
}

// Load timeline state
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return errorResponse(
                "scenarioId is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const idResult = z.string().min(1).safeParse(scenarioIdParam);
        if (!idResult.success) {
            return validationErrorResponse(
                idResult.error.format(),
                "Invalid scenarioId",
            );
        }
        const scenarioId = idResult.data;

        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const timelineDoc = await timelineRef.get();

        if (!timelineDoc.exists) {
            return successResponse({ timeline: null });
        }

        const data = timelineDoc.data();

        // Verify ownership
        if (data?.userId !== session.user.id) {
            return forbiddenResponse();
        }

        return successResponse({ timeline: data });
    } catch (error) {
        logger.error(`Error loading timeline: ${error}`);
        return errorResponse("Failed to load timeline", "LOAD_TIMELINE_ERROR");
    }
}

// Delete timeline (reset to scenario defaults)
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return errorResponse(
                "scenarioId is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const idResult = z.string().min(1).safeParse(scenarioIdParam);
        if (!idResult.success) {
            return validationErrorResponse(
                idResult.error.format(),
                "Invalid scenarioId",
            );
        }
        const scenarioId = idResult.data;

        const timelineRef = firestore.collection("timelines").doc(scenarioId);
        const timelineDoc = await timelineRef.get();

        if (timelineDoc.exists) {
            const data = timelineDoc.data();

            // Verify ownership before deleting
            if (data?.userId !== session.user.id) {
                return forbiddenResponse();
            }

            await timelineRef.delete();
        }

        return successResponse({ success: true });
    } catch (error) {
        logger.error(`Error deleting timeline: ${error}`);
        return errorResponse(
            "Failed to delete timeline",
            "DELETE_TIMELINE_ERROR",
        );
    }
}
