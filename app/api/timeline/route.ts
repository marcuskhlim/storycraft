import { NextRequest } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp, FieldPath } from "@google-cloud/firestore";
import { timelineApiPostSchema } from "@/app/schemas";
import { z } from "zod";
import logger from "@/app/logger";
import {
    successResponse,
    unauthorizedResponse,
    forbiddenResponse,
    errorResponse,
    validationErrorResponse,
} from "@/lib/api/response";

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
        const parseResult = timelineApiPostSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const { scenarioId, layers } = parseResult.data;

        // Use scenarioId as the timeline document ID (1:1 relationship)
        const timelineRef = firestore.collection("timelines").doc(scenarioId);

        await firestore.runTransaction(async (transaction) => {
            const existingDoc = await transaction.get(timelineRef);

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
                    throw new Error("FORBIDDEN");
                }
                transaction.update(timelineRef, timelineData);
            } else {
                transaction.set(timelineRef, {
                    ...timelineData,
                    createdAt: Timestamp.now(),
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

        const timelineSnapshot = await firestore
            .collection("timelines")
            .where(FieldPath.documentId(), "==", scenarioId)
            .where("userId", "==", session.user.id)
            .limit(1)
            .get();

        if (timelineSnapshot.empty) {
            return successResponse({ timeline: null });
        }

        const data = timelineSnapshot.docs[0].data();

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

        const userId = session.user.id;
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
}
