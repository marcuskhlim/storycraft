import { z } from "zod";
import { validationErrorResponse } from "../api/response";
import logger from "@/app/logger";

/**
 * Validates data against a Zod schema.
 * Returns the parsed data or a validation error response.
 *
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @param errorMessage Optional custom error message
 */
export function validateInput<T>(
    data: unknown,
    schema: z.Schema<T>,
    errorMessage: string = "Validation failed",
) {
    const result = schema.safeParse(data);

    if (!result.success) {
        logger.error(
            `${errorMessage}: ${JSON.stringify(result.error.format())}`,
        );
        return {
            success: false,
            errorResponse: validationErrorResponse(
                result.error.format(),
                errorMessage,
            ),
        } as const;
    }

    return {
        success: true,
        data: result.data,
    } as const;
}
