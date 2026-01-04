"use server";

import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import logger from "@/app/logger";
import { conversationalEditSchema } from "@/app/schemas";
import { Scenario } from "@/app/types";

interface ConversationalEditParams {
    imageGcsUri: string;
    instruction: string;
    sceneNumber: number;
    scenarioId: string;
    scenario?: Scenario; // Optional scenario context
}

interface ConversationalEditResult {
    success: boolean;
    imageGcsUri?: string;
    errorMessage?: string;
}

export async function conversationalEdit(
    params: ConversationalEditParams,
): Promise<ConversationalEditResult> {
    const { imageGcsUri, instruction, sceneNumber, scenarioId, scenario } =
        params;
    try {
        const parseResult = conversationalEditSchema.safeParse(params);
        if (!parseResult.success) {
            logger.error(
                "Validation error in conversationalEdit:",
                parseResult.error,
            );
            return {
                success: false,
                errorMessage: `Invalid input: ${parseResult.error.message}`,
            };
        }

        logger.info(
            `Starting conversational edit for scene ${sceneNumber} in scenario ${scenarioId}`,
        );

        // We use a minimal scenario if none provided, but style might be missing.
        // In real usage, the caller should ideally provide the scenario.
        const result = await generateImageForScenario({
            scenario: scenario || ({ id: scenarioId } as Scenario),
            instruction,
            imageGcsUri,
        });

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
            `Error in conversational edit for scene ${params.sceneNumber}:`,
            error,
        );
        return {
            success: false,
            errorMessage: "An error occurred while editing the image",
        };
    }
}
