"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Minus, Plus, Video, Clock } from "lucide-react";

interface VideoConfigFormProps {
    numScenes: number;
    setNumScenes: (val: number) => void;
    durationSeconds: number;
    setDurationSeconds: (val: number) => void;
    totalLength: number;
}

export function VideoConfigForm({
    numScenes,
    setNumScenes,
    durationSeconds,
    setDurationSeconds,
    totalLength,
}: VideoConfigFormProps) {
    return (
        <Card className="flex-[2] border border-zinc-200 shadow-none dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <Video className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Video Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="uppercase tracking-wider text-muted-foreground">
                            Scene Count
                        </Label>
                        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setNumScenes(Math.max(1, numScenes - 1))
                                }
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <div className="flex w-8 items-center justify-center font-bold">
                                {numScenes}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setNumScenes(Math.min(20, numScenes + 1))
                                }
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="uppercase tracking-wider text-muted-foreground">
                                Duration per scene
                            </Label>
                            <span className="font-bold text-[#0EA5E9]">
                                {durationSeconds}s
                            </span>
                        </div>
                        <div className="pt-2">
                            <Slider
                                min={4}
                                max={8}
                                step={2}
                                value={durationSeconds}
                                onValueChange={(val) => setDurationSeconds(val)}
                            />
                            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                                {" "}
                                <span>4s</span>
                                <span>6s</span>
                                <span>8s</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm text-muted-foreground">
                        Total Length
                    </span>
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Clock className="h-5 w-5 text-[#0EA5E9]" />
                        <span>{totalLength} seconds</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
