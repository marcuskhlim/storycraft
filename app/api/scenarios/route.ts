import { NextRequest } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Scene } from "@/app/types";
import logger from "@/app/logger";
import { scenarioApiPostSchema } from "@/app/schemas";
import { z } from "zod";
import {
    successResponse,
    unauthorizedResponse,
    forbiddenResponse,
    errorResponse,
    notFoundResponse,
    validationErrorResponse,
} from "@/lib/api/response";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
        const body = await request.json();

        // Validate request body
        const parseResult = scenarioApiPostSchema.safeParse(body);
        if (!parseResult.success) {
            logger.error(
                `Scenario validation failed: ${JSON.stringify(parseResult.error.format())}`,
            );
            return validationErrorResponse(parseResult.error.format());
        }
        // ... (rest of the code)

        const { scenario, scenarioId } = parseResult.data;

        // Generate a unique ID if not provided
        const id = scenarioId || firestore.collection("scenarios").doc().id;

        // Prepare the scenario data for Firestore (filter out undefined values)
        const baseScenario = {
            id,
            userId,
            name: scenario.name || "",
            pitch: scenario.pitch || "",
            scenario: scenario.scenario || "",
            aspectRatio: scenario.aspectRatio || "16:9",
            durationSeconds: scenario.durationSeconds || 8,
            style: scenario.style || "",
            genre: scenario.genre || "",
            mood: scenario.mood || "",
            music: scenario.music || "",
            language: scenario.language || {
                name: "English (United States)",
                code: "en-US",
            },
            characters: scenario.characters || [],
            props: scenario.props || [],
            settings: scenario.settings || [],
            scenes: (scenario.scenes || []).map((scene: Scene) => {
                const sceneData: Record<string, unknown> = {
                    imagePrompt: scene.imagePrompt,
                    videoPrompt: scene.videoPrompt,
                    description: scene.description || "",
                    voiceover: scene.voiceover || "",
                    charactersPresent: scene.charactersPresent || [],
                };

                // Only add optional fields if they have values
                if (scene.imageGcsUri)
                    sceneData.imageGcsUri = scene.imageGcsUri;
                if (typeof scene.videoUri === "string")
                    sceneData.videoUri = scene.videoUri;
                if (typeof scene.voiceoverAudioUri === "string")
                    sceneData.voiceoverAudioUri = scene.voiceoverAudioUri;
                if (scene.errorMessage)
                    sceneData.errorMessage = scene.errorMessage;

                return sceneData;
            }),
        };

        // Add optional fields only if they have values
        const firestoreScenario: Record<string, unknown> = { ...baseScenario };
        if (scenario.musicUrl) firestoreScenario.musicUrl = scenario.musicUrl;
        if (scenario.logoOverlay)
            firestoreScenario.logoOverlay = scenario.logoOverlay;

        const scenarioRef = firestore.collection("scenarios").doc(id);

        await firestore.runTransaction(async (transaction) => {
            const scenarioDoc = await transaction.get(scenarioRef);

            if (scenarioDoc.exists) {
                // Check if user owns this scenario
                const existingData = scenarioDoc.data();
                if (existingData?.userId !== userId) {
                    throw new Error("FORBIDDEN");
                }

                // Update existing scenario
                logger.info(`Updating scenario: ${id}`);
                transaction.update(scenarioRef, {
                    ...firestoreScenario,
                    updatedAt: new Date(),
                });
            } else {
                // Create new scenario
                logger.info(`Creating new scenario: ${id}`);
                transaction.set(scenarioRef, {
                    ...firestoreScenario,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        });

        return successResponse({ scenarioId: id });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
            return forbiddenResponse();
        }
        logger.error(`Error saving scenario: ${error}`);
        return errorResponse("Failed to save scenario", "SAVE_ERROR");
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("id");

        // Validate scenarioId if provided
        let scenarioId: string | null = null;
        if (scenarioIdParam) {
            const idResult = z.string().safeParse(scenarioIdParam);
            if (!idResult.success) {
                return validationErrorResponse(
                    idResult.error.format(),
                    "Invalid scenario ID",
                );
            }
            scenarioId = idResult.data;
        }

        if (scenarioId) {
            // Get specific scenario for this user
            const scenarioDoc = await firestore
                .collection("scenarios")
                .doc(scenarioId)
                .get();

            if (!scenarioDoc.exists) {
                return notFoundResponse("Scenario not found");
            }

            const scenarioData = scenarioDoc.data();

            // Verify ownership
            if (scenarioData?.userId !== userId) {
                // Return 404 to avoid leaking existence of other users' scenarios, or 403 if preferred.
                // Using notFoundResponse to mimic the previous query behavior (which wouldn't find it).
                return notFoundResponse("Scenario not found");
            }

            return successResponse({
                id: scenarioId,
                ...scenarioData,
            });
        } else {
            // Get all scenarios for user
            const scenariosRef = firestore
                .collection("scenarios")
                .where("userId", "==", userId)
                .orderBy("updatedAt", "desc");

            const scenariosSnapshot = await scenariosRef.get();
            const scenarios = scenariosSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return successResponse({ scenarios });
        }
    } catch (error) {
        logger.error(`Error fetching scenarios: ${error}`);
        return errorResponse("Failed to fetch scenarios", "FETCH_ERROR");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return unauthorizedResponse();
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const scenarioIdParam = searchParams.get("id");

        if (!scenarioIdParam) {
            return errorResponse(
                "Scenario ID is required",
                "VALIDATION_ERROR",
                400,
            );
        }

        const idResult = z.string().safeParse(scenarioIdParam);
        if (!idResult.success) {
            return validationErrorResponse(
                idResult.error.format(),
                "Invalid scenario ID",
            );
        }
        const scenarioId = idResult.data;

        // Get the scenario reference
        const scenarioRef = firestore.collection("scenarios").doc(scenarioId);

        // Use a transaction to atomically verify ownership and delete both scenario and timeline
        try {
            await firestore.runTransaction(async (transaction) => {
                const scenarioDoc = await transaction.get(scenarioRef);

                if (!scenarioDoc.exists) {
                    throw new Error("NOT_FOUND");
                }

                const scenarioData = scenarioDoc.data();

                // Check if user owns this scenario
                if (scenarioData?.userId !== userId) {
                    throw new Error("FORBIDDEN");
                }

                // Delete the scenario
                transaction.delete(scenarioRef);

                // Delete the associated timeline if it exists
                const timelineRef = firestore
                    .collection("timelines")
                    .doc(scenarioId);
                transaction.delete(timelineRef);
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === "NOT_FOUND") {
                    return notFoundResponse("Scenario not found");
                }
                if (error.message === "FORBIDDEN") {
                    return forbiddenResponse();
                }
            }
            throw error; // Re-throw for the outer catch block
        }

        return successResponse({ success: true });
    } catch (error) {
        logger.error(`Error deleting scenario: ${error}`);
        return errorResponse("Failed to delete scenario", "DELETE_ERROR");
    }
}
