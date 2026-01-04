import { firestore } from "@/lib/storage/firestore";
import logger from "@/app/logger";

/**
 * Verifies that the given user owns the scenario.
 * @param scenarioId The ID of the scenario to check.
 * @param userId The ID of the user to verify ownership against.
 * @returns A promise that resolves to true if the user owns the scenario, false otherwise.
 */
export async function verifyScenarioOwnership(
    scenarioId: string | undefined,
    userId: string,
): Promise<boolean> {
    if (!scenarioId) {
        return true; // No scenario ID means it's likely a new scenario or not yet saved
    }

    try {
        const scenarioDoc = await firestore
            .collection("scenarios")
            .doc(scenarioId)
            .get();

        if (!scenarioDoc.exists) {
            return false;
        }

        const data = scenarioDoc.data();
        return data?.userId === userId;
    } catch (error) {
        logger.error(
            `Error verifying scenario ownership for ${scenarioId}:`,
            error,
        );
        return false;
    }
}
