"use server";

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { saveImageToPublicSchema } from "@/app/schemas";

import logger from "@/app/logger";

export async function saveImageToPublic(
    base64String: string,
    originalFilename: string,
): Promise<string> {
    try {
        const parseResult = saveImageToPublicSchema.safeParse({
            base64String,
            originalFilename,
        });
        if (!parseResult.success) {
            logger.error(
                "Validation error in saveImageToPublic:",
                parseResult.error,
            );
            throw new Error(`Invalid input: ${parseResult.error.message}`);
        }

        // Extract the file extension from the original filename
        const fileExtension = path.extname(originalFilename).toLowerCase();

        // Create a unique filename
        const uniqueFilename = `${uuidv4()}${fileExtension}`;

        // Define the directory and full path where the image will be saved
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const filePath = path.join(uploadDir, uniqueFilename);

        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Remove the data URL prefix and convert base64 to buffer
        const base64Data = base64String.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Write the file to the public directory
        fs.writeFileSync(filePath, buffer);

        // Return the public URL path to the saved image
        return `/uploads/${uniqueFilename}`;
    } catch (error) {
        logger.error(`Error saving image: ${error}`);
        throw new Error("Failed to save image");
    }
}
