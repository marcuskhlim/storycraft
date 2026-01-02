import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/storage/firestore";
import { auth } from "@/auth";
import { Timestamp } from "@google-cloud/firestore";
import { Scene } from "@/app/types";
import logger from "@/app/logger";
import { scenarioSchema } from "@/app/schemas";
import { z } from "zod";
import { 
    successResponse, 
    unauthorizedResponse, 
    forbiddenResponse, 
    errorResponse, 
    notFoundResponse, 
    validationErrorResponse 
} from "@/lib/api/response";

const postSchema = z.object({
    scenario: scenarioSchema,
    scenarioId: z.string().optional(),
});

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
        const scenarioDoc = await scenarioRef.get();

        if (scenarioDoc.exists) {
            // Check if user owns this scenario
            const existingData = scenarioDoc.data();
            if (existingData?.userId !== userId) {
                return forbiddenResponse();
            }

            // Update existing scenario
            logger.info(`Updating scenario: ${id}`);
            await scenarioRef.update({
                ...firestoreScenario,
                updatedAt: Timestamp.now(),
            });
        } else {
            // Create new scenario
            logger.info(`Creating new scenario: ${id}`);
            await scenarioRef.set({
                ...firestoreScenario,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        return successResponse({ scenarioId: id });
    } catch (error) {
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
                return validationErrorResponse(idResult.error.format(), "Invalid scenario ID");
            }
            scenarioId = idResult.data;
        }

        if (scenarioId) {
            // Get specific scenario
            const scenarioRef = firestore
                .collection("scenarios")
                .doc(scenarioId);
            const scenarioDoc = await scenarioRef.get();

            if (!scenarioDoc.exists) {
                return notFoundResponse("Scenario not found");
            }

            const scenarioData = scenarioDoc.data();

            // Check if user owns this scenario
            if (scenarioData?.userId !== userId) {
                return forbiddenResponse();
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
            return errorResponse("Scenario ID is required", "VALIDATION_ERROR", 400);
        }

        const idResult = z.string().safeParse(scenarioIdParam);
        if (!idResult.success) {
            return validationErrorResponse(idResult.error.format(), "Invalid scenario ID");
        }
        const scenarioId = idResult.data;

        // Get the scenario to verify ownership
        const scenarioRef = firestore.collection("scenarios").doc(scenarioId);
        const scenarioDoc = await scenarioRef.get();

        if (!scenarioDoc.exists) {
            return notFoundResponse("Scenario not found");
        }

        const scenarioData = scenarioDoc.data();

        // Check if user owns this scenario
        if (scenarioData?.userId !== userId) {
            return forbiddenResponse();
        }

        // Delete the scenario
        await scenarioRef.delete();

        return successResponse({ success: true });
    } catch (error) {
        logger.error(`Error deleting scenario: ${error}`);
        return errorResponse("Failed to delete scenario", "DELETE_ERROR");
    }
}
