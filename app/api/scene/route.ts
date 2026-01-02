import logger from "@/app/logger";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { 
    successResponse, 
    unauthorizedResponse, 
    validationErrorResponse 
} from "@/lib/api/response";

const postSchema = z.object({
    imagePrompt: z.string().min(1),
    description: z.string().min(1),
    voiceover: z.string().min(1),
    imageBase64: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    const body = await req.json();

    // Validate request body
    const parseResult = postSchema.safeParse(body);
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
}
