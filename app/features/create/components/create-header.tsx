"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { LoadingMessages } from "@/app/features/shared/components/ui/loading-messages";

interface CreateHeaderProps {
    isLoading: boolean;
    onGenerate: () => void;
    canGenerate: boolean;
}

export function CreateHeader({
    isLoading,
    onGenerate,
    canGenerate,
}: CreateHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">
                    Define your story
                </h2>
                <p className="text-muted-foreground">
                    Start by pitching your idea and setting the visual tone.
                </p>
            </div>
            <div className="flex items-center gap-4">
                <LoadingMessages isLoading={isLoading} phase="scenario" />
                <Button
                    size="lg"
                    onClick={onGenerate}
                    disabled={isLoading || !canGenerate}
                    className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <BookOpen className="mr-2 h-5 w-5" />
                            Generate Scenario
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
