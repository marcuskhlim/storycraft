"use server";

import { exportMovie as exportMovieFFMPEG } from "@/lib/utils/ffmpeg";
import { TimelineLayer } from "@/app/types";
import logger from "@/app/logger";
import { exportMovieSchema } from "@/app/schemas";

export async function exportMovieAction(
    layers: Array<TimelineLayer>,
): Promise<
    | { success: true; videoUrl: string; vttUrl?: string }
    | { success: false; error: string }
> {
    try {
        exportMovieSchema.parse({ layers });
        logger.debug("Exporting movie...");
        const { videoUrl, vttUrl } = await exportMovieFFMPEG(layers);
        logger.debug(`videoUrl: ${videoUrl}`);
        if (vttUrl) logger.debug(`vttUrl: ${vttUrl}`);
        logger.debug(`Generated video!`);
        return { success: true, videoUrl, vttUrl };
    } catch (error) {
        logger.error("Error in generateVideo:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to generate video",
        };
    }
}
