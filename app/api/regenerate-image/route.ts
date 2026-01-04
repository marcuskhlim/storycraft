import { NextRequest } from "next/server";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import logger from "@/app/logger";
import { auth } from "@/auth";
import { Scenario } from "@/app/types";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import {
    regenerateImageApiPostSchema,
    regenerateImageApiPutSchema,
} from "@/app/schemas";
import {
    successResponse,
    unauthorizedResponse,
    errorResponse,
    validationErrorResponse,
} from "@/lib/api/response";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();

        // Validate request body
        const parseResult = regenerateImageApiPostSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const {
            prompt,
            scenario,
            modelName = DEFAULT_SETTINGS.imageModel,
        } = parseResult.data;

        const result = await generateImageForScenario({
            scenario,
            imagePrompt: prompt,
            modelName,
        });

        return successResponse(result);
    } catch (error) {
        logger.error("Error regenerating image:", error);
        return errorResponse(
            "Failed to regenerate image",
            "IMAGE_REGEN_ERROR",
            500,
            error instanceof Error ? error.message : "Unknown error",
        );
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();

        // Validate request body
        // Note: regenerateImageApiPutSchema only has 'prompt'
        const parseResult = regenerateImageApiPutSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const { prompt } = parseResult.data;

        // For PUT (character/entity regeneration), we can still use generateImageForScenario
        // if we provide a minimal scenario and the entity description.
        // However, the current regenerateImageApiPutSchema is very minimal.
        // To maintain backward compatibility while using the centralized action,
        // we'll need to adapt it.

        // Actually, looking at modify-scenario.ts, PUT is NOT used.
        // It seems PUT might be legacy or unused from client side.
        // But let's refactor it to use the new action assuming prompt is the entity description.

        const result = await generateImageForScenario({
            scenario: {
                style: "Photographic",
                aspectRatio: "1:1",
                characters: [],
                settings: [],
                props: [],
                name: "",
                pitch: "",
                scenario: "",
                durationSeconds: 0,
                genre: "",
                mood: "",
                music: "",
                language: { name: "English", code: "en-US" },
                scenes: [],
            } as Scenario,
            entity: { name: "Entity", description: prompt },
            entityType: "character", // Default to character for 1:1
        });

        return successResponse(result);
    } catch (error) {
        logger.error("Error regenerating character image:", error);
        return errorResponse(
            "Failed to regenerate character image",
            "CHAR_IMAGE_REGEN_ERROR",
            500,
            error instanceof Error ? error.message : "Unknown error",
        );
    }
}
