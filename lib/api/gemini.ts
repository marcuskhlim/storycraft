import {
    ContentListUnion,
    GenerateContentConfig,
    GoogleGenAI,
    ThinkingLevel,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { uploadImage } from "@/lib/storage/storage";
import logger from "@/app/logger";
import { env } from "@/lib/utils/env";
import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import { withRetry } from "@/lib/utils/retry";

const PROJECT_ID = env.PROJECT_ID;

const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: "global",
});

export async function generateContent(
    prompt: ContentListUnion,
    config: GenerateContentConfig = {
        thinkingConfig: {
            // includeThoughts: true,
            thinkingBudget: -1,
        },
        responseMimeType: "application/json",
    },
    model: string = DEFAULT_SETTINGS.llmModel,
): Promise<string | undefined> {
    logger.debug("Generate content : " + model);
    if (
        model === "gemini-3-pro-preview" ||
        model === "gemini-3-flash-preview"
    ) {
        config = {
            ...config,
            thinkingConfig: {
                // includeThoughts: true,
                thinkingLevel: ThinkingLevel.LOW,
            },
            responseMimeType: config.responseMimeType,
        };
    }

    const useSearchAndBrowser = false;
    if (useSearchAndBrowser) {
        config.tools = [{ googleSearch: {} }, { urlContext: {} }];
        config.responseMimeType = "text/plain";
    }

    const response = await ai.models.generateContent({
        model,
        config,
        contents: prompt,
    });

    return response.text;
}

interface GenerateNanoBananaImageResponse {
    success: boolean;
    imageGcsUri?: string;
    errorMessage?: string;
}

export async function generateImage(
    prompt: ContentListUnion,
    config: GenerateContentConfig = {
        responseModalities: ["IMAGE"],
        candidateCount: 1,
    },
    model: string = DEFAULT_SETTINGS.imageModel,
): Promise<GenerateNanoBananaImageResponse> {
    logger.debug(JSON.stringify(prompt, null, 2));

    return withRetry(
        async () => {
            const ai = new GoogleGenAI({
                vertexai: true,
                project: env.PROJECT_ID,
                location: "global",
            });

            logger.debug("Generate Image : " + model);
            logger.debug("Config : " + JSON.stringify(config, null, 2));
            const response = await ai.models.generateContent({
                model,
                config,
                contents: prompt,
            });

            // Process the response to find and save the generated image
            if (!response.candidates || response.candidates.length === 0) {
                logger.warn("No candidates found in the response.");
                // If no candidates, but no error, it might be a valid (empty) response, so break retry loop.
                return {
                    success: false,
                    errorMessage: "No candidates found in the response.",
                };
            }

            const firstCandidate = response.candidates[0];
            let imageGcsUri;
            for (const part of firstCandidate.content!.parts!) {
                if (part.inlineData) {
                    const imageBuffer = Buffer.from(
                        part.inlineData!.data!,
                        "base64",
                    );
                    const uuid = uuidv4();
                    imageGcsUri = await uploadImage(
                        imageBuffer.toString("base64"),
                        `gemini-${uuid}.png`,
                    );
                    return { success: true, imageGcsUri: imageGcsUri! };
                }
            }
            // If we reach here, no inlineData was found but no error occurred, so break retry loop.
            return { success: false, errorMessage: response.text };
        },
        {
            maxRetries: 5,
            onRetry: (attempt, error, delay) => {
                logger.warn(
                    `Attempt ${attempt} failed for generateImage. Retrying in ${Math.round(delay)}ms...`,
                    error,
                );
            },
        },
    );
}
