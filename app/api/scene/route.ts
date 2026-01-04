import logger from "@/app/logger";
import { sceneApiPostSchema } from "@/app/schemas";
import { successResponse, errorResponse } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { validateInput } from "@/lib/utils/validation";

export const POST = withAuth(async (req) => {
    try {
        const body = await req.json();

        // Validate request body
        const validation = validateInput(body, sceneApiPostSchema);
        if (!validation.success) {
            return validation.errorResponse;
        }

        const scene = validation.data;

        // Simulate processing (e.g., fetching data, saving to DB, etc.)
        logger.debug(`start temp for ${scene.voiceover}`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        logger.debug(`end temp for ${scene.voiceover}`);
        const message = `temp for ${scene.voiceover}`;
        return successResponse({ message });
    } catch (error) {
        logger.error("Error in scene route:", error);
        return errorResponse(
            error instanceof Error ? error.message : "Failed to process scene",
            "SCENE_PROCESS_ERROR",
        );
    }
});
