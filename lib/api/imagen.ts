import logger from "@/app/logger";
import { withRetry } from "@/lib/utils/retry";
import { getAccessToken } from "./auth-utils";

const LOCATION = process.env.LOCATION;
const PROJECT_ID = process.env.PROJECT_ID;
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI;
const MODEL = "imagen-4.0-generate-001";
const MODEL_EDIT = "imagen-3.0-capability-001";

interface GenerateImageResponse {
    predictions: Array<{
        bytesBase64Encoded: string;
        mimeType: string;
        gcsUri: string;
        raiFilteredReason?: string;
    }>;
}

export async function generateImageRest(
    prompt: string,
    aspectRatio?: string,
    enhancePrompt?: boolean,
): Promise<GenerateImageResponse> {
    const token = await getAccessToken();
    logger.debug(prompt);

    return withRetry(
        async () => {
            const response = await fetch(
                `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        instances: [
                            {
                                prompt: prompt,
                            },
                        ],
                        parameters: {
                            // storageUri: "gs://svc-demo-vertex-us/",
                            safetySetting: "block_only_high",
                            personGeneration: "allow_all",
                            sampleCount: 1,
                            aspectRatio: aspectRatio ? aspectRatio : "16:9",
                            includeRaiReason: true,
                            storageUri: GCS_VIDEOS_STORAGE_URI,
                            enhancePrompt:
                                enhancePrompt !== undefined
                                    ? enhancePrompt
                                    : false,
                            language: "auto",
                            sampleImageSize: "2K", // '1K'
                            // seed: 1005,
                            addWatermark: false,
                        },
                    }),
                },
            );
            // Check if the response was successful
            if (!response.ok) {
                throw new Error(
                    `HTTP error! status: ${response.status} ${JSON.stringify(await response.json())}`,
                );
            }
            const jsonResult = await response.json(); // Parse as JSON
            return jsonResult;
        },
        { maxRetries: 5 },
    );
}

export async function generateImageCustomizationRest(
    prompt: string,
    characters: Array<{
        name: string;
        description: string;
        imageBase64?: string;
    }>,
    aspectRatio?: string,
): Promise<GenerateImageResponse> {
    const token = await getAccessToken();

    const referenceImagesPayload = characters
        .filter((character) => character.imageBase64)
        .map((character, index) => ({
            referenceType: "REFERENCE_TYPE_SUBJECT",
            referenceId: index + 1,
            referenceImage: {
                bytesBase64Encoded: character.imageBase64!,
            },
            subjectImageConfig: {
                subjectDescription: character.description,
                subjectType: "SUBJECT_TYPE_PERSON",
            },
        }));

    const customizedPrompt = `Generate an image of ${referenceImagesPayload.map((ref) => `${ref.subjectImageConfig.subjectDescription} [${ref.referenceId}]`)} to match this description: ${prompt}`;

    const body = JSON.stringify({
        instances: [
            {
                prompt: customizedPrompt,
                referenceImages: referenceImagesPayload,
            },
        ],
        parameters: {
            // storageUri: "gs://svc-demo-vertex-us/",
            safetySetting: "block_only_high",
            sampleCount: 1,
            aspectRatio: aspectRatio ? aspectRatio : "16:9",
            includeRaiReason: true,
            language: "auto",
        },
    });

    return withRetry(
        async () => {
            const response = await fetch(
                `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_EDIT}:predict`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json; charset=utf-8",
                    },
                    body: body,
                },
            );
            // Check if the response was successful
            if (!response.ok) {
                logger.debug(response);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonResult = await response.json(); // Parse as JSON
            return jsonResult;
        },
        { maxRetries: 1 },
    );
}
