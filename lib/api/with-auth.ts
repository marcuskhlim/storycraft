import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { unauthorizedResponse, errorResponse } from "./response";
import logger from "@/app/logger";
import { Session } from "next-auth";

export type AuthenticatedContext = {
    session: Session;
    userId: string;
};

export type AuthenticatedHandler = (
    request: NextRequest,
    context: AuthenticatedContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap API handlers with authentication.
 * It ensures the user is authenticated and provides the session and userId to the handler.
 */
export function withAuth(handler: AuthenticatedHandler) {
    return async (request: NextRequest) => {
        try {
            const session = await auth();

            if (!session?.user?.id) {
                return unauthorizedResponse();
            }

            return await handler(request, {
                session,
                userId: session.user.id,
            });
        } catch (error) {
            logger.error(`Error in authenticated route: ${error}`);
            return errorResponse(
                "An unexpected error occurred",
                "INTERNAL_SERVER_ERROR",
                500,
            );
        }
    };
}
