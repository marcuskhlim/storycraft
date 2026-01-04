"use server";

import { tts } from "@/lib/api/tts";
import { Language } from "@/app/types";
import logger from "@/app/logger";
import { generateVoiceoverSchema } from "@/app/schemas";
import { requireAuth } from "@/lib/api/auth-utils";

export async function generateVoiceover(
    scenes: Array<{
        voiceover: string;
    }>,
    language: Language,
    voiceName?: string,
): Promise<string[]> {
    await requireAuth();
    const parseResult = generateVoiceoverSchema.safeParse({
        scenes,
        language,
        voiceName,
    });
    if (!parseResult.success) {
        logger.error(
            "Validation error in generateVoiceover:",
            parseResult.error,
        );
        throw new Error(`Invalid input: ${parseResult.error.message}`);
    }

    logger.debug(`Generating voiceover with voice: ${voiceName || "default"}`);
    try {
        const speachAudioFiles = await Promise.all(
            scenes.map(async (scene) => {
                const filename = await tts(
                    scene.voiceover,
                    language.code,
                    voiceName,
                );
                return { filename, text: scene.voiceover };
            }),
        );
        const voiceoverAudioUrls = speachAudioFiles.map((r) => r.filename);
        return voiceoverAudioUrls;
    } catch (error) {
        logger.error("Error generating voiceover:", error);
        throw new Error(
            `Failed to generate voiceover: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
