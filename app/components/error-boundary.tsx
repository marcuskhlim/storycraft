"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { clientLogger } from "@/lib/client-logger";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        clientLogger.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Something went wrong
                        </h2>
                        <p className="max-w-[400px] text-sm text-muted-foreground">
                            {this.state.error?.message ||
                                "An unexpected error occurred in this section of the application."}
                        </p>
                    </div>
                    <Button onClick={handleReset} variant="outline" size="sm">
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

function handleReset() {
    window.location.reload();
}
