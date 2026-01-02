import { GoogleAuth } from "google-auth-library";

const globalForAuth = global as unknown as { auth: GoogleAuth };

const auth: GoogleAuth =
    globalForAuth.auth ||
    new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForAuth.auth = auth;
}

/**
 * Gets a Google Cloud access token with the cloud-platform scope.
 * The GoogleAuth instance is cached to reuse credentials.
 */
export async function getAccessToken(): Promise<string> {
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    if (accessToken) {
        return accessToken;
    } else {
        throw new Error("Failed to obtain access token.");
    }
}
