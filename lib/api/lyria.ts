import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { concatenateMusicWithFade } from "@/lib/utils/ffmpeg";
import logger from "@/app/logger";
import { withRetry } from "@/lib/utils/retry";
import { getAccessToken } from "./auth-utils";
import { storage } from "@/lib/storage/storage";

const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI || "";
const LOCATION = process.env.LOCATION;
const PROJECT_ID = process.env.PROJECT_ID;
const MODEL = "lyria-002";

export async function generateMusicRest(prompt: string): Promise<string> {
    const token = await getAccessToken();
    logger.debug(MODEL);

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
                            sampleCount: 1,
                        },
                    }),
                },
            );
            // Check if the response was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonResult = await response.json(); // Parse as JSON
            const audioContent = jsonResult.predictions[0].bytesBase64Encoded;
            // Decode base64 to buffer
            const audioBuffer = Buffer.from(audioContent, "base64");
            const outputBuffer = await concatenateMusicWithFade(
                audioBuffer,
                "mp3",
            );

            // Define the directory where you want to save the audio files
            const publicDir = path.join(process.cwd(), "public");
            const outputDir = path.join(publicDir, "music");

            // Ensure the directory exists
            fs.mkdirSync(outputDir, { recursive: true });

            // Generate a unique filename, e.g., using a timestamp or a UUID
            const uuid = uuidv4();
            const fileName = `music-${uuid}.mp3`;

            // Return the relative file path (for serving the file)
            // Upload to GCS
            logger.debug(`Upload result to GCS`);
            const bucketName = GCS_VIDEOS_STORAGE_URI.replace(
                "gs://",
                "",
            ).split("/")[0];
            const destinationPath = path.join(
                GCS_VIDEOS_STORAGE_URI.replace(`gs://${bucketName}/`, ""),
                fileName,
            );
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(destinationPath);

            await file.save(outputBuffer, {
                metadata: {
                    contentType: `audio/mpeg`, // Set the correct content type for MP3
                },
            });

            return file.cloudStorageURI.href;
        },
        { maxRetries: 1 },
    );
}
