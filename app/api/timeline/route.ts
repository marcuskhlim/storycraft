import { firestore } from "@/lib/storage/firestore";
import { timelineApiPostSchema } from "@/app/schemas";
import { z } from "zod";
import logger from "@/app/logger";
import {
    successResponse,
    forbiddenResponse,
    errorResponse,
} from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { validateInput } from "@/lib/utils/validation";

// Save or update timeline state
export const POST = withAuth(async (request, { userId }) => {
    try {
        const body = await request.json();

        // Validate request body
        const validation = validateInput(body, timelineApiPostSchema);
        if (!validation.success) {
            return validation.errorResponse;
        }

        const { scenarioId, layers } = validation.data;

        // Use scenarioId as the timeline document ID (1:1 relationship)
        const timelineRef = firestore.collection("timelines").doc(scenarioId);

        await firestore.runTransaction(async (transaction) => {
            const existingDoc = await transaction.get(timelineRef);

            const timelineData = {
                id: scenarioId,
                scenarioId,
                userId,
                layers,
                updatedAt: new Date(),
            };

            if (existingDoc.exists) {
                // Verify ownership before updating
                const existingData = existingDoc.data();
                if (existingData?.userId !== userId) {
                    throw new Error("FORBIDDEN");
                }
                transaction.update(timelineRef, timelineData);
            } else {
                transaction.set(timelineRef, {
                    ...timelineData,
                    createdAt: new Date(),
                });
            }
        });

        return successResponse({ timelineId: scenarioId });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
            return forbiddenResponse();
        }
        logger.error(`Error saving timeline: ${error}`);
        return errorResponse("Failed to save timeline", "SAVE_TIMELINE_ERROR");
    }
});

// Load timeline state
export const GET = withAuth(async (request, { userId }) => {
    try {
        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return errorResponse(
                "scenarioId is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const validation = validateInput(
            scenarioIdParam,
            z.string().min(1),
            "Invalid scenarioId",
        );
        if (!validation.success) {
            return validation.errorResponse;
        }
        const scenarioId = validation.data;

        const timelineDoc = await firestore
            .collection("timelines")
            .doc(scenarioId)
            .get();

        if (!timelineDoc.exists) {
            return successResponse({ timeline: null });
        }

        const data = timelineDoc.data();

        if (data?.userId !== userId) {
            // Treat as not found/null for security
            return successResponse({ timeline: null });
        }

        return successResponse({ timeline: data });
    } catch (error) {
        logger.error(`Error loading timeline: ${error}`);
        return errorResponse("Failed to load timeline", "LOAD_TIMELINE_ERROR");
    }
});

// Delete timeline (reset to scenario defaults)
export const DELETE = withAuth(async (request, { userId }) => {
    try {
        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("scenarioId");

        if (!scenarioIdParam) {
            return errorResponse(
                "scenarioId is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const validation = validateInput(
            scenarioIdParam,
            z.string().min(1),
            "Invalid scenarioId",
        );
        if (!validation.success) {
            return validation.errorResponse;
        }
        const scenarioId = validation.data;

        const timelineRef = firestore.collection("timelines").doc(scenarioId);

        await firestore.runTransaction(async (transaction) => {
            const timelineDoc = await transaction.get(timelineRef);

            if (timelineDoc.exists) {
                const data = timelineDoc.data();

                // Verify ownership before deleting
                if (data?.userId !== userId) {
                    throw new Error("FORBIDDEN");
                }

                transaction.delete(timelineRef);
            }
        });

        return successResponse({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
            return forbiddenResponse();
        }
        logger.error(`Error deleting timeline: ${error}`);
        return errorResponse(
            "Failed to delete timeline",
            "DELETE_TIMELINE_ERROR",
        );
    }
});
