import { auth } from "@/auth";
import { limiter } from "@/lib/utils/rate-limit";
import { NextResponse } from "next/server";

export default auth(async (req) => {
    const { nextUrl, auth: session } = req;

    // Apply rate limiting to API routes
    if (nextUrl.pathname.startsWith("/api")) {
        const userId = session?.user?.id || "anonymous";

        try {
            // Allow 50 requests per minute per user
            await limiter.check(50, userId);
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "RATE_LIMIT_EXCEEDED",
                        message:
                            "Too many requests. Please try again in a minute.",
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                    },
                },
                { status: 429 },
            );
        }
    }

    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const isDev = process.env.NODE_ENV === "development";

    const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://storage.googleapis.com https://*.googleusercontent.com;
    media-src 'self' blob: https://storage.googleapis.com;
    connect-src 'self' https://*.googleapis.com https://*.google.com https://accounts.google.com;
    frame-src 'self' https://accounts.google.com;
    frame-ancestors 'none';
  `
        .replace(/\s{2,}/g, " ")
        .trim();

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", cspHeader);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    response.headers.set("Content-Security-Policy", cspHeader);

    return response;
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    // Now including api routes but still excluding static assets
    matcher: [
        "/((?!_next/static|_next/image|manifest.webmanifest|favicon.ico|.*\\.png$).*)",
    ],
};
