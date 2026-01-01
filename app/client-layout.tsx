"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import { SettingsProvider } from "@/app/features/shared/hooks/use-settings";
import { ErrorBoundary } from "@/app/features/shared/components/error-boundary";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [queryClient] = useState(() => new QueryClient());

    useAuth();

    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>
                <ErrorBoundary>{children}</ErrorBoundary>
            </SettingsProvider>
        </QueryClientProvider>
    );
}
