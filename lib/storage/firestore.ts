import { Firestore } from "@google-cloud/firestore";
import { env } from "@/lib/utils/env";

// Initialize Firestore client for the specific database
const firestore = new Firestore({
    projectId: env.PROJECT_ID,
    databaseId: env.FIRESTORE_DATABASE_ID,
    // Add connection pooling settings
    maxIdleTime: 0, // 30 seconds
    maxConcurrency: 100, // Max concurrent requests
    keepAlive: true,
});

export { firestore };
