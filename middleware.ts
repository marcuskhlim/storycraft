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
                    error: "Too many requests. Please try again in a minute.",
                },
                { status: 429 },
            );
        }
    }

    return NextResponse.next();
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    // Now including api routes but still excluding static assets
    matcher: [
        "/((?!_next/static|_next/image|manifest.webmanifest|favicon.ico|.*\\.png$).*)",
    ],
};
