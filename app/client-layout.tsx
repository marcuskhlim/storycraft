"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useAuthSync } from "@/app/features/shared/hooks/use-auth";
import { Toaster } from "sonner";
import { SettingsProvider } from "@/app/features/shared/hooks/use-settings";
import { ErrorBoundary } from "@/app/features/shared/components/error-boundary";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 5, // 5 minutes
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ClientLayoutContent>{children}</ClientLayoutContent>
        </QueryClientProvider>
    );
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
    useAuthSync();

    return (
        <SettingsProvider>
            <ErrorBoundary>
                {children}
                <Toaster position="top-right" richColors />
            </ErrorBoundary>
        </SettingsProvider>
    );
}
