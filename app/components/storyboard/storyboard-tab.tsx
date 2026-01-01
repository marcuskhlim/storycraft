"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    Grid,
    List,
    Loader2,
    Presentation,
    Video,
    ChevronLeft,
    ChevronRight,
    Plus,
    Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { Scene, ImagePrompt, VideoPrompt } from "../../types";
import { SceneData } from "./scene-data";
import { SceneCard } from "./scene-card";
import { GcsImage } from "../ui/gcs-image";
import { VideoPlayer } from "../video/video-player";
import { LoadingMessages } from "@/app/components/ui/loading-messages";

function ImagePromptDisplay({ imagePrompt }: { imagePrompt: ImagePrompt }) {
    return (
        <div className="space-y-3">
            <div>
                <span className="text-xs font-medium">Style:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Style}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Scene:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Scene}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Composition:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Composition.shot_type},{" "}
                    {imagePrompt.Composition.lighting},{" "}
                    {imagePrompt.Composition.overall_mood}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Subjects:</span>
                {imagePrompt.Subject.map((subject, index) => (
                    <p
                        key={index}
                        className="ml-2 text-sm text-card-foreground/80"
                    >
                        • {subject.name}
                    </p>
                ))}
            </div>
            <div>
                <span className="text-xs font-medium">Props:</span>
                {imagePrompt.Prop?.map((prop, index) => (
                    <p
                        key={index}
                        className="ml-2 text-sm text-card-foreground/80"
                    >
                        • {prop.name}
                    </p>
                ))}
            </div>
            <div>
                <span className="text-xs font-medium">Context:</span>
                {imagePrompt.Context.map((context, index) => (
                    <p
                        key={index}
                        className="ml-2 text-sm text-card-foreground/80"
                    >
                        • {context.name}
                    </p>
                ))}
            </div>
        </div>
    );
}

function VideoPromptDisplay({ videoPrompt }: { videoPrompt: VideoPrompt }) {
    return (
        <div className="space-y-3">
            <div>
                <span className="text-xs font-medium">Action:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Action}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Camera Motion:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Camera_Motion}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Ambiance Audio:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Ambiance_Audio}
                </p>
            </div>
            {videoPrompt.Dialogue.length > 0 && (
                <div>
                    <span className="text-xs font-medium">Dialogue:</span>
                    {videoPrompt.Dialogue.map((dialogue, index) => (
                        <p
                            key={index}
                            className="ml-2 text-sm text-card-foreground/80"
                        >
                            • {dialogue.speaker}: &quot;{dialogue.line}&quot;
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useScenarioStore } from "@/stores/useScenarioStore";
import { useLoadingStore } from "@/stores/useLoadingStore";

type ViewMode = "grid" | "list" | "slideshow";
type DisplayMode = "image" | "video";

interface StoryboardTabProps {
    onGenerateAllVideos: () => Promise<void>;
    onUpdateScene: (index: number, updatedScene: Scene) => void;
    onRegenerateImage: (index: number) => Promise<void>;
    onGenerateVideo: (index: number) => Promise<void>;
    onUploadImage: (index: number, file: File) => Promise<void>;
    onAddScene: () => void;
    onRemoveScene: (index: number) => void;
    onReorderScenes: (fromIndex: number, toIndex: number) => void;
}

export function StoryboardTab({
    onGenerateAllVideos,
    onUpdateScene,
    onRegenerateImage,
    onGenerateVideo,
    onUploadImage,
    onAddScene,
    onRemoveScene,
    onReorderScenes,
}: StoryboardTabProps) {
    const { scenario, errorMessage } = useScenarioStore();
    const { video: isVideoLoading, scenes: generatingScenes } =
        useLoadingStore();

    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("image");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [activeTabs, setActiveTabs] = useState<{ [key: number]: string }>({});

    if (!scenario) return null;

    const scenes = scenario.scenes;

    const handleGenerateAllVideosClick = () => {
        onGenerateAllVideos();
    };

    // No need for effects to sync these states - handle clamping at usage time and defaulting at usage time

    // Clamp current slide to valid range on render
    const effectiveCurrentSlide = Math.min(
        currentSlide,
        Math.max(0, scenes.length - 1),
    );

    const setActiveTab = (sceneIndex: number, tab: string) => {
        setActiveTabs((prev) => ({
            ...prev,
            [sceneIndex]: tab,
        }));
    };

    const getActiveTab = (sceneIndex: number) => {
        return activeTabs[sceneIndex] || "general";
    };

    const handleDragStart = (index: number) => (e: React.DragEvent) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", index.toString());
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDrop = (index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            onReorderScenes(draggedIndex, index);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const renderScenes = () => {
        switch (viewMode) {
            case "grid":
                return (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {scenes.map((scene, index) => (
                            <SceneCard
                                key={index}
                                sceneNumber={index + 1}
                                scene={scene}
                                scenario={scenario}
                                onUpdate={(updatedScene) =>
                                    onUpdateScene(index, updatedScene)
                                }
                                onRegenerateImage={() =>
                                    onRegenerateImage(index)
                                }
                                onGenerateVideo={() => onGenerateVideo(index)}
                                onUploadImage={(file) =>
                                    onUploadImage(index, file)
                                }
                                onRemoveScene={() => onRemoveScene(index)}
                                isGenerating={generatingScenes.has(index)}
                                canDelete={scenes.length > 1}
                                displayMode={displayMode}
                                isDragOver={dragOverIndex === index}
                                onDragStart={handleDragStart(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver(index)}
                                onDrop={handleDrop(index)}
                            />
                        ))}
                        {/* Add Scene Card */}
                        <Card
                            className="cursor-pointer overflow-hidden border-2 border-dashed transition-colors hover:bg-accent/50"
                            onClick={() => onAddScene()}
                        >
                            <div className="flex h-full flex-col">
                                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted/30">
                                    <div className="text-center">
                                        <Plus className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Add Scene
                                        </p>
                                    </div>
                                </div>
                                <CardContent className="flex flex-1 items-center justify-center p-4">
                                    <p className="text-center text-sm text-muted-foreground">
                                        Click to add a new scene
                                    </p>
                                </CardContent>
                            </div>
                        </Card>
                    </div>
                );
            case "list":
                return (
                    <div className="space-y-6">
                        {scenes.map((scene, index) => (
                            <div key={index} className="flex gap-6">
                                <div className="w-1/3">
                                    <SceneData
                                        sceneNumber={index + 1}
                                        scene={scene}
                                        scenario={scenario}
                                        onUpdate={(updatedScene) =>
                                            onUpdateScene(index, updatedScene)
                                        }
                                        onRegenerateImage={() =>
                                            onRegenerateImage(index)
                                        }
                                        onGenerateVideo={() =>
                                            onGenerateVideo(index)
                                        }
                                        onUploadImage={(file) =>
                                            onUploadImage(index, file)
                                        }
                                        onRemoveScene={() =>
                                            onRemoveScene(index)
                                        }
                                        isGenerating={generatingScenes.has(
                                            index,
                                        )}
                                        canDelete={scenes.length > 1}
                                        displayMode={displayMode}
                                        hideControls
                                        isDragOver={dragOverIndex === index}
                                        onDragStart={handleDragStart(index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver(index)}
                                        onDrop={handleDrop(index)}
                                    />
                                </div>
                                <div className="w-2/3">
                                    <div className="h-full rounded-lg border bg-card p-4">
                                        <h3 className="mb-4 font-semibold text-card-foreground">
                                            Scene {index + 1}
                                        </h3>

                                        {/* Tab Navigation */}
                                        <div className="mb-4 flex border-b border-border">
                                            <div
                                                role="tab"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setActiveTab(
                                                        index,
                                                        "general",
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        setActiveTab(
                                                            index,
                                                            "general",
                                                        );
                                                    }
                                                }}
                                                className={`cursor-pointer select-none border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                                    getActiveTab(index) ===
                                                    "general"
                                                        ? "border-primary text-primary"
                                                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                                }`}
                                            >
                                                General
                                            </div>
                                            <div
                                                role="tab"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setActiveTab(index, "image")
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        setActiveTab(
                                                            index,
                                                            "image",
                                                        );
                                                    }
                                                }}
                                                className={`cursor-pointer select-none border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                                    getActiveTab(index) ===
                                                    "image"
                                                        ? "border-primary text-primary"
                                                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                                }`}
                                            >
                                                Image Prompt
                                            </div>
                                            <div
                                                role="tab"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setActiveTab(index, "video")
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        setActiveTab(
                                                            index,
                                                            "video",
                                                        );
                                                    }
                                                }}
                                                className={`cursor-pointer select-none border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                                    getActiveTab(index) ===
                                                    "video"
                                                        ? "border-primary text-primary"
                                                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                                }`}
                                            >
                                                Video Prompt
                                            </div>
                                        </div>

                                        {/* Tab Content */}
                                        {getActiveTab(index) === "general" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="mb-1 text-sm font-medium text-card-foreground">
                                                        Description
                                                    </h4>
                                                    <p className="whitespace-pre-wrap text-sm text-card-foreground/80">
                                                        {scene.description}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h4 className="mb-1 text-sm font-medium text-card-foreground">
                                                        Voiceover
                                                    </h4>
                                                    <p className="whitespace-pre-wrap text-sm text-card-foreground/80">
                                                        {scene.voiceover}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {getActiveTab(index) === "image" && (
                                            <div className="space-y-4">
                                                <ImagePromptDisplay
                                                    imagePrompt={
                                                        scene.imagePrompt
                                                    }
                                                />
                                            </div>
                                        )}

                                        {getActiveTab(index) === "video" && (
                                            <div className="space-y-4">
                                                <VideoPromptDisplay
                                                    videoPrompt={
                                                        scene.videoPrompt
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Add Scene Card */}
                        <div className="flex gap-6">
                            <div className="w-1/3">
                                <Card
                                    className="cursor-pointer overflow-hidden border-2 border-dashed transition-colors hover:bg-accent/50"
                                    onClick={() => onAddScene()}
                                >
                                    <div className="flex h-full flex-col">
                                        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted/30">
                                            <div className="text-center">
                                                <Plus className="mx-auto mb-1 h-8 w-8 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">
                                                    Add Scene
                                                </p>
                                            </div>
                                        </div>
                                        <CardContent className="p-2">
                                            <p className="text-center text-xs text-muted-foreground">
                                                New Scene
                                            </p>
                                        </CardContent>
                                    </div>
                                </Card>
                            </div>
                            <div className="w-2/3">
                                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        Click to add a new scene
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "slideshow":
                if (scenes.length === 0) return null;
                const goToPrevious = () => {
                    setCurrentSlide((prev) =>
                        prev > 0 ? prev - 1 : scenes.length - 1,
                    );
                };
                const goToNext = () => {
                    setCurrentSlide((prev) =>
                        prev < scenes.length - 1 ? prev + 1 : 0,
                    );
                };
                return (
                    <div className="relative mx-auto max-w-4xl">
                        <div className="group relative aspect-video max-h-[60vh] overflow-hidden rounded-lg bg-black">
                            {displayMode === "video" &&
                            scenes[effectiveCurrentSlide].videoUri ? (
                                <div className="absolute inset-0">
                                    <VideoPlayer
                                        videoGcsUri={
                                            scenes[effectiveCurrentSlide]
                                                .videoUri
                                        }
                                        aspectRatio={scenario.aspectRatio}
                                    />
                                </div>
                            ) : (
                                <GcsImage
                                    gcsUri={
                                        scenes[effectiveCurrentSlide]
                                            .imageGcsUri || null
                                    }
                                    alt={`Scene ${effectiveCurrentSlide + 1}`}
                                    className="h-full w-full object-contain"
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
                                            imagePrompt={
                                                scenes[effectiveCurrentSlide]
                                                    .imagePrompt
                                            }
                                        />
                                    </div>
                                    <div>
                                        <h4 className="mb-1 text-sm font-medium text-card-foreground">
                                            Voiceover
                                        </h4>
                                        <p className="text-sm text-card-foreground/80">
                                            {
                                                scenes[effectiveCurrentSlide]
                                                    .voiceover
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => onAddScene()}
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
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Visualize your story
                    </h2>
                    <p className="text-muted-foreground">
                        Review scenes and generate the actual video clips.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="mr-8 flex items-center gap-2">
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "h-8 w-8 border-0 hover:bg-accent hover:text-accent-foreground",
                                    viewMode === "grid" &&
                                        "bg-accent text-accent-foreground",
                                )}
                            >
                                <Grid className="h-4 w-4" />
                                <span className="sr-only">Grid view</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "h-8 w-8 border-0 hover:bg-accent hover:text-accent-foreground",
                                    viewMode === "list" &&
                                        "bg-accent text-accent-foreground",
                                )}
                            >
                                <List className="h-4 w-4" />
                                <span className="sr-only">List view</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setViewMode("slideshow")}
                                className={cn(
                                    "h-8 w-8 border-0 hover:bg-accent hover:text-accent-foreground",
                                    viewMode === "slideshow" &&
                                        "bg-accent text-accent-foreground",
                                )}
                            >
                                <Presentation className="h-4 w-4" />
                                <span className="sr-only">Slideshow view</span>
                            </Button>
                        </div>

                        {/* Display Mode Slider */}
                        <div className="ml-2 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <div
                                className="relative h-5 w-8 cursor-pointer rounded-full bg-muted"
                                onClick={() =>
                                    setDisplayMode(
                                        displayMode === "image"
                                            ? "video"
                                            : "image",
                                    )
                                }
                            >
                                <div
                                    className={cn(
                                        "absolute top-0.5 h-4 w-4 rounded-full bg-primary transition-transform duration-200",
                                        displayMode === "video"
                                            ? "translate-x-3.5"
                                            : "translate-x-0.5",
                                    )}
                                />
                            </div>
                            <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                    <LoadingMessages isLoading={isVideoLoading} />
                    <Button
                        size="lg"
                        onClick={handleGenerateAllVideosClick}
                        disabled={
                            isVideoLoading ||
                            scenes.length === 0 ||
                            generatingScenes.size > 0
                        }
                        className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        {isVideoLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Video className="mr-2 h-5 w-5" />
                                Generate Videos
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {renderScenes()}

            {errorMessage && (
                <div className="mt-4 whitespace-pre-wrap rounded border border-red-400 bg-red-100 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}
