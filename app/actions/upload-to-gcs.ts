"use server";

import { uploadImage, getSignedUrlFromGCS } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export async function uploadStyleImageToGCS(base64: string, filename: string) {
    const uniqueFilename = `styles/${uuidv4()}-${filename}`;
    const gcsUri = await uploadImage(base64, uniqueFilename);
    return gcsUri;
}

export async function getSignedUrlAction(gcsUri: string) {
    if (!gcsUri) return null;
    return await getSignedUrlFromGCS(gcsUri);
}
