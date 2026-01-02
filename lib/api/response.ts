import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/api";

export function successResponse<T>(data: T, meta?: ApiResponse<T>["meta"]): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    });
}

export function errorResponse(
    message: string,
    code: string = "INTERNAL_ERROR",
    status: number = 500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any,
): NextResponse<ApiResponse<never>> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details,
            },
            meta: {
                timestamp: new Date().toISOString(),
            },
        },
        { status },
    );
}

export function unauthorizedResponse(message: string = "Unauthorized"): NextResponse<ApiResponse<never>> {
    return errorResponse(message, "UNAUTHORIZED", 401);
}

export function forbiddenResponse(message: string = "Forbidden"): NextResponse<ApiResponse<never>> {
    return errorResponse(message, "FORBIDDEN", 403);
}

export function notFoundResponse(message: string = "Resource not found"): NextResponse<ApiResponse<never>> {
    return errorResponse(message, "NOT_FOUND", 404);
}

export function validationErrorResponse(details: any, message: string = "Invalid request body"): NextResponse<ApiResponse<never>> {
    return errorResponse(message, "VALIDATION_ERROR", 400, details);
}
