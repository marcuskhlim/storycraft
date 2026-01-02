import logger from "@/app/logger";
import { getRAIUserMessage } from "@/lib/utils/rai";
import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import { withRetry } from "@/lib/utils/retry";
import { getAccessToken } from "./auth-utils";

const LOCATION = process.env.LOCATION;
const PROJECT_ID = process.env.PROJECT_ID;
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI;

interface GenerateVideoResponse {
    name: string;
    done: boolean;
    response: {
        "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse";
        videos: Array<{
            gcsUri: string;
            mimeType: string;
        }>;
        raiMediaFilteredReasons?: Array<string>;
    };
    error?: {
        // Add an optional error field to handle operation errors
        code: number;
        message: string;
        status: string;
    };
}

async function checkOperation(
    operationName: string,
    model: string = DEFAULT_SETTINGS.videoModel,
): Promise<GenerateVideoResponse> {
    const token = await getAccessToken();

    const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:fetchPredictOperation`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operationName: operationName,
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    return jsonResponse as GenerateVideoResponse;
}

export async function waitForOperation(
    operationName: string,
    model: string = DEFAULT_SETTINGS.videoModel,
): Promise<GenerateVideoResponse> {
    const checkInterval = 2000; // Interval for checking operation status (in milliseconds)

    const pollOperation = async (): Promise<GenerateVideoResponse> => {
        logger.debug(`poll operation ${operationName}`);
        const generateVideoResponse = await checkOperation(
            operationName,
            model,
        );

        if (generateVideoResponse.done) {
            // Check if there was an error during the operation
            if (generateVideoResponse.error) {
                logger.error(
                    `Operation failed with error: ${generateVideoResponse.error.message}`,
                );
                throw new Error(
                    getRAIUserMessage(generateVideoResponse.error.message),
                );
            }
            return generateVideoResponse;
        } else {
            await delay(checkInterval);
            return pollOperation(); // Recursive call for the next poll
        }
    };

    return pollOperation();
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSceneVideo(
    prompt: string,
    imageGcsUri: string,
    aspectRatio: string = "16:9",
    model: string = DEFAULT_SETTINGS.videoModel,
    generateAudio: boolean = DEFAULT_SETTINGS.generateAudio,
    durationSeconds: number = 8,
): Promise<string> {
    const token = await getAccessToken();

    const modifiedPrompt = prompt + "\nSubtitles: off";

    logger.debug(model);

    return withRetry(
        async () => {
            const response = await fetch(
                `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predictLongRunning`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instances: [
                            {
                                prompt: modifiedPrompt,
                                image: {
                                    gcsUri: imageGcsUri,
                                    mimeType: "png",
                                },
                            },
                        ],
                        parameters: {
                            storageUri: GCS_VIDEOS_STORAGE_URI,
                            sampleCount: 1,
                            aspectRatio: aspectRatio,
                            generateAudio: generateAudio,
                            durationSeconds: durationSeconds,
                            compressionQuality: "optimized", // "lossless"
                            resolution: "1080p", // "720p"
                        },
                    }),
                },
            );

            // Check if the response was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jsonResult = await response.json(); // Parse as JSON
            return jsonResult.name;
        },
        { maxRetries: 5 },
    );
}
