"use client";

import { cn } from "@/lib/utils";

interface Step {
    id: string;
    label: string;
    disabled?: boolean;
}

interface TopNavProps {
    steps: Step[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export function TopNav({ steps, activeTab, onTabChange }: TopNavProps) {
    return (
        <nav className="mx-auto flex w-fit items-center space-x-2 rounded-full border border-border/50 bg-card/50 p-2 shadow-sm">
            {steps.map((step) => {
                const isActive = activeTab === step.id;
                // Find if this step is "completed" (this logic depends on your needs,
                // for now we just verify if it's previous to active or logic handled by parent)
                // But for a tab bar, we usually just show active state.

                return (
                    <button
                        key={step.id}
                        disabled={step.disabled}
                        onClick={() => onTabChange(step.id)}
                        className={cn(
                            "relative rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            step.disabled &&
                                "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
                        )}
                    >
                        {step.label}
                    </button>
                );
            })}
        </nav>
    );
}
