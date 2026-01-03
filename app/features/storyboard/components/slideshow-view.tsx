"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";
import { VideoPlayer } from "@/app/features/editor/components/video-player";
import { ImagePromptDisplay } from "./image-prompt-display";
import { Scenario, Scene } from "@/app/types";

interface SlideshowViewProps {
    scenes: Scene[];
    scenario: Scenario;
    displayMode: "image" | "video";
    onAddScene: () => void;
}

export function SlideshowView({
    scenes,
    scenario,
    displayMode,
    onAddScene,
}: SlideshowViewProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (scenes.length === 0) return null;

    // Clamp current slide to valid range
    const effectiveCurrentSlide = Math.min(
        currentSlide,
        Math.max(0, scenes.length - 1),
    );

    const goToPrevious = () => {
        setCurrentSlide((prev) => (prev > 0 ? prev - 1 : scenes.length - 1));
    };

    const goToNext = () => {
        setCurrentSlide((prev) => (prev < scenes.length - 1 ? prev + 1 : 0));
    };

    const currentScene = scenes[effectiveCurrentSlide];

    return (
        <div className="relative mx-auto max-w-4xl">
            <div className="group relative aspect-video max-h-[60vh] overflow-hidden rounded-lg bg-black">
                {displayMode === "video" && currentScene.videoUri ? (
                    <div className="absolute inset-0">
                        <VideoPlayer
                            videoGcsUri={currentScene.videoUri}
                            aspectRatio={scenario.aspectRatio}
                        />
                    </div>
                ) : (
                    <GcsImage
                        gcsUri={currentScene.imageGcsUri || null}
                        alt={`Scene ${effectiveCurrentSlide + 1}`}
                        className="h-full w-full object-contain"
                        sizes="(max-width: 896px) 100vw, 896px"
                    />
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
                >
                    <ChevronLeft className="h-6 w-6" />
                    <span className="sr-only">Previous scene</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
                >
                    <ChevronRight className="h-6 w-6" />
                    <span className="sr-only">Next scene</span>
                </Button>
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm">
                    {scenes.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={cn(
                                "h-3 w-3 rounded-full transition-colors",
                                effectiveCurrentSlide === index
                                    ? "bg-white"
                                    : "bg-white/50 hover:bg-white/75",
                            )}
                            aria-label={`Go to scene ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
            <div className="mt-4 space-y-4">
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-2 font-semibold text-card-foreground">
                        Scene {effectiveCurrentSlide + 1}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="mb-1 text-sm font-medium text-card-foreground">
                                Image Prompt
                            </h4>
                            <ImagePromptDisplay
                                imagePrompt={currentScene.imagePrompt}
                            />
                        </div>
                        <div>
                            <h4 className="mb-1 text-sm font-medium text-card-foreground">
                                Voiceover
                            </h4>
                            <p className="text-sm text-card-foreground/80">
                                {currentScene.voiceover}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={onAddScene}
                        className="border-2 border-dashed hover:bg-accent"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Scene
                    </Button>
                </div>
            </div>
        </div>
    );
}
