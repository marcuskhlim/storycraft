"use server";

import { generateMusicRest } from "@/lib/api/lyria";
import logger from "@/app/logger";
import { generateMusicSchema } from "@/app/schemas";

export async function generateMusic(prompt: string): Promise<string> {
    const parseResult = generateMusicSchema.safeParse({ prompt });
    if (!parseResult.success) {
        logger.error("Validation error in generateMusic:", parseResult.error);
        throw new Error(`Invalid input: ${parseResult.error.message}`);
    }
    logger.debug("Generating music");
    try {
        const musicUrl = await generateMusicRest(prompt);
        logger.debug("Music generated!");
        return musicUrl;
    } catch (error) {
        logger.error("Error generating music:", error);
        throw new Error(
            `Failed to music: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
