import { GoogleAuth } from "google-auth-library";

let auth: GoogleAuth | null = null;

/**
 * Gets a Google Cloud access token with the cloud-platform scope.
 * The GoogleAuth instance is cached to reuse credentials.
 */
export async function getAccessToken(): Promise<string> {
    if (!auth) {
        auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
    }

    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    if (accessToken) {
        return accessToken;
    } else {
        throw new Error("Failed to obtain access token.");
    }
}
