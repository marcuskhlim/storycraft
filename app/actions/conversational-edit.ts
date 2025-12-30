"use server";

import { generateImage } from "@/lib/gemini";
import { createPartFromText, createPartFromUri } from "@google/genai";
import logger from "@/app/logger";

interface ConversationalEditParams {
    imageGcsUri: string;
    instruction: string;
    sceneNumber: number;
    scenarioId: string;
}

interface ConversationalEditResult {
    success: boolean;
    imageGcsUri?: string;
    errorMessage?: string;
}

export async function conversationalEdit({
    imageGcsUri,
    instruction,
    sceneNumber,
    scenarioId,
}: ConversationalEditParams): Promise<ConversationalEditResult> {
    try {
        logger.info(
            `Starting conversational edit for scene ${sceneNumber} in scenario ${scenarioId}`,
        );

        const result = await generateImage([
            createPartFromUri(imageGcsUri, "image/png"),
            createPartFromText(instruction),
        ]);

        if (result.success && result.imageGcsUri) {
            logger.info(
                `Successfully edited image for scene ${sceneNumber}. New image URI: ${result.imageGcsUri}`,
            );
            return {
                success: true,
                imageGcsUri: result.imageGcsUri,
            };
        } else {
            logger.error(
                `Failed to edit image for scene ${sceneNumber}: ${result.errorMessage}`,
            );
            return {
                success: false,
                errorMessage: result.errorMessage || "Failed to edit image",
            };
        }
    } catch (error) {
        logger.error(
            `Error in conversational edit for scene ${sceneNumber}:`,
            error,
        );
        return {
            success: false,
            errorMessage: "An error occurred while editing the image",
        };
    }
}
