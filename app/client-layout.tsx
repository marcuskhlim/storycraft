"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SettingsProvider } from "@/hooks/use-settings";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [queryClient] = useState(() => new QueryClient());

    useAuth();

    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>{children}</SettingsProvider>
        </QueryClientProvider>
    );
}
