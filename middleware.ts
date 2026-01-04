import { auth } from "@/auth";
import { limiter } from "@/lib/utils/rate-limit";
import { NextResponse } from "next/server";

export default auth(async (req) => {
    const { nextUrl, auth: session } = req;
    const isLoggedIn = !!session?.user;
    const isAuthApiRoute = nextUrl.pathname.startsWith("/api/auth");
    const isOnSignIn = nextUrl.pathname.startsWith("/sign-in");

    // --- 1. HANDLE AUTH REDIRECTS MANUALLY ---
    // NextResponse.next() overrides the automatic Auth.js redirect.
    if (isAuthApiRoute) {
        return NextResponse.next();
    }

    if (isOnSignIn) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/", nextUrl));
        }
        // Allow unauthenticated users to see the sign-in page
    } else if (!isLoggedIn) {
        // Protected routes: redirect to sign-in if not logged in
        // Note: You can add logic here to ignore specific public routes
        const signInUrl = new URL("/sign-in", nextUrl);
        // Optional: Add the current page as a callback URL so users return here after login
        signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
    }

    // --- 2. RATE LIMITING ---
    if (nextUrl.pathname.startsWith("/api")) {
        const userId = session?.user?.id || "anonymous";
        try {
            await limiter.check(200, userId);
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests.",
                    },
                },
                { status: 429 },
            );
        }
    }

    // --- 3. CSP & HEADERS ---
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
        request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", cspHeader);

    return response;
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|manifest.webmanifest|favicon.ico|.*\\.png$).*)",
    ],
};
