"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";

const ASPECT_RATIOS = [
    { name: "16:9", value: "16:9", icon: RectangleHorizontal },
    { name: "9:16", value: "9:16", icon: Smartphone },
];

interface FormatSelectorProps {
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
}

export function FormatSelector({
    aspectRatio,
    setAspectRatio,
}: FormatSelectorProps) {
    return (
        <Card className="flex-1 border border-border shadow-none ">
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <div className="h-4 w-4 rounded border-2 border-current" />
                </div>
                <CardTitle className="text-lg">Format</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {ASPECT_RATIOS.map((ratio) => {
                        const Icon = ratio.icon;
                        const isSelected = aspectRatio === ratio.value;
                        return (
                            <button
                                key={ratio.value}
                                onClick={() => setAspectRatio(ratio.value)}
                                className={cn(
                                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                                    isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800",
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-lg",
                                        isSelected
                                            ? "bg-[#0EA5E9] text-white"
                                            : "bg-gray-200 text-gray-500 dark:bg-gray-800",
                                    )}
                                >
                                    <Icon className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-semibold">
                                    {ratio.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
