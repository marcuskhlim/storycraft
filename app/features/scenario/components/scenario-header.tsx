"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Loader2 } from "lucide-react";
import { LoadingMessages } from "@/app/features/shared/components/ui/loading-messages";

interface ScenarioHeaderProps {
    isLoading: boolean;
    onGenerateStoryboard: () => void;
}

export const ScenarioHeader = memo(function ScenarioHeader({
    isLoading,
    onGenerateStoryboard,
}: ScenarioHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                    Review your scenario
                </h2>
                <p className="text-muted-foreground">
                    Refine the characters, settings, and story details.
                </p>
            </div>
            <div className="flex items-center gap-4">
                <LoadingMessages isLoading={isLoading} phase="storyboard" />
                <Button
                    size="lg"
                    onClick={onGenerateStoryboard}
                    disabled={isLoading}
                    className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <LayoutGrid className="mr-2 h-5 w-5" />
                            Generate Storyboard
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
});
