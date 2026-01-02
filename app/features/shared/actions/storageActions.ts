"use server";

import { uploadImage, getSignedUrlFromGCS } from "@/lib/storage/storage";
import { v4 as uuidv4 } from "uuid";
import { uploadStyleImageToGCSSchema } from "@/app/schemas";
import { z } from "zod";

export async function uploadStyleImageToGCS(base64: string, filename: string) {
    const parseResult = uploadStyleImageToGCSSchema.safeParse({
        base64,
        filename,
    });
    if (!parseResult.success) {
        throw new Error(`Invalid input: ${parseResult.error.message}`);
    }
    const uniqueFilename = `styles/${uuidv4()}-${filename}`;
    const gcsUri = await uploadImage(base64, uniqueFilename);
    return gcsUri;
}

export async function getSignedUrlAction(gcsUri: string) {
    const parseResult = z.string().safeParse(gcsUri);
    if (!parseResult.success) {
        throw new Error(`Invalid GCS URI: ${parseResult.error.message}`);
    }
    if (!gcsUri) return null;
    return await getSignedUrlFromGCS(gcsUri);
}
