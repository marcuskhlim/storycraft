"use server";

import {
    getMimeTypeFromGCS,
    getSignedUrlFromGCS,
    uploadImage,
} from "@/lib/storage/storage";
import { unstable_cache as cache } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import logger from "@/app/logger";
import {
    getDynamicImageUrlSchema,
    uploadImageToGCSSchema,
} from "@/app/schemas";
import { requireAuth } from "@/lib/api/auth-utils";

/**
 * Server Action to securely get a signed URL for a GCS object.
 * Uses unstable_cache for time-based caching.
 *
 * @param gcsUri The gs:// URI of the object.
 * @returns A promise that resolves to the signed URL string, or null if an error occurs or URI is invalid.
 */
export async function getDynamicImageUrl(
    gcsUri: string,
    download: boolean = false,
): Promise<{ url: string | null; mimeType: string | null }> {
    await requireAuth();
    const parseResult = getDynamicImageUrlSchema.safeParse({
        gcsUri,
        download,
    });
    if (!parseResult.success) {
        logger.error(
            "Validation error in getDynamicImageUrl:",
            parseResult.error,
        );
        return { url: null, mimeType: null };
    }

    // Call the cached function
    logger.debug(`getDynamicImageUrl: ${gcsUri}`);

    return cache(
        async (
            uri: string,
            dl: boolean,
        ): Promise<{ url: string | null; mimeType: string | null }> => {
            logger.debug(`CACHE MISS: Fetching signed URL for ${uri}`);
            if (!uri || !uri.startsWith("gs://")) {
                logger.error(
                    `Invalid GCS URI passed to cached function: ${uri}`,
                );
                return { url: null, mimeType: null };
            }
            try {
                // get mime type from gcs uri
                const mimeType = await getMimeTypeFromGCS(uri);
                // Call the original GCS function
                const url = await getSignedUrlFromGCS(uri, dl);
                return { url, mimeType };
            } catch (error) {
                logger.error(
                    `Error getting signed URL for ${uri} inside cache function:`,
                    error,
                );
                return { url: null, mimeType: null };
            }
        },
        ["gcs-signed-url", gcsUri, String(download)], // Unique key per URI and download flag
        {
            revalidate: 60 * 30, // Revalidate every 30 minutes (1800 seconds)
            tags: ["gcs-url"],
        },
    )(gcsUri, download);
}

export async function uploadImageToGCS(base64: string): Promise<string | null> {
    await requireAuth();
    const parseResult = uploadImageToGCSSchema.safeParse({ base64 });
    if (!parseResult.success) {
        logger.error(
            "Validation error in uploadImageToGCS:",
            parseResult.error,
        );
        return null;
    }
    const gcsUri = await uploadImage(base64, uuidv4());
    return gcsUri;
}
