import { Roboto } from "next/font/google";
import ClientLayout from "./client-layout";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

const roboto = Roboto({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    display: "swap",
    variable: "--font-roboto",
});

export const metadata = {
    title: "StoryCraft",
    description: "AI-powered storyboard generation",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={roboto.className} suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <NextAuthSessionProvider>
                        <ClientLayout>{children}</ClientLayout>
                    </NextAuthSessionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
