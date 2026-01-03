import { Firestore, Timestamp } from "@google-cloud/firestore";
import { env } from "@/lib/utils/env";

// Use a global variable to ensure the client is reused across HMR in development
const globalForFirestore = global as unknown as { firestore: Firestore };

// Initialize Firestore client for the specific database
const firestore =
    globalForFirestore.firestore ||
    new Firestore({
        projectId: env.PROJECT_ID,
        databaseId: env.FIRESTORE_DATABASE_ID,
        // Add connection pooling settings
        maxIdleTime: 180 * 1000, // 60 seconds
        maxConcurrency: 100, // Max concurrent requests
        keepAlive: true,
    });

if (process.env.NODE_ENV !== "production") {
    globalForFirestore.firestore = firestore;
}

export { firestore, Timestamp };
