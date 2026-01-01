"use server";

import { uploadImage, getSignedUrlFromGCS } from "@/lib/storage/storage";
import { v4 as uuidv4 } from "uuid";
import { uploadStyleImageToGCSSchema } from "@/app/schemas";
import { z } from "zod";

export async function uploadStyleImageToGCS(base64: string, filename: string) {
    uploadStyleImageToGCSSchema.parse({ base64, filename });
    const uniqueFilename = `styles/${uuidv4()}-${filename}`;
    const gcsUri = await uploadImage(base64, uniqueFilename);
    return gcsUri;
}

export async function getSignedUrlAction(gcsUri: string) {
    z.string().parse(gcsUri);
    if (!gcsUri) return null;
    return await getSignedUrlFromGCS(gcsUri);
}
