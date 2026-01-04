import logger from "@/app/logger";
import { auth } from "@/auth";
import { sceneApiPostSchema } from "@/app/schemas";
import {
    successResponse,
    unauthorizedResponse,
    validationErrorResponse,
    errorResponse,
} from "@/lib/api/response";

export async function POST(req: Request): Promise<Response> {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    try {
        const body = await req.json();

        // Validate request body
        const parseResult = sceneApiPostSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const scene = parseResult.data;

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
}
