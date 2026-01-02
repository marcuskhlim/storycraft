"use client";

import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SceneCard } from "./scene-card";
import { Scenario, Scene } from "@/app/types";

interface GridViewProps {
    scenes: Scene[];
    scenario: Scenario;
    displayMode: "image" | "video";
    generatingScenes: Set<number>;
    dragOverIndex: number | null;
    onUpdateScene: (index: number, updatedScene: Scene) => void;
    onRegenerateImage: (index: number) => void;
    onGenerateVideo: (index: number) => void;
    onUploadImage: (index: number, file: File) => void;
    onRemoveScene: (index: number) => void;
    onAddScene: () => void;
    onDragStart: (index: number) => (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (index: number) => (e: React.DragEvent) => void;
    onDrop: (index: number) => (e: React.DragEvent) => void;
}

export function GridView({
    scenes,
    scenario,
    displayMode,
    generatingScenes,
    dragOverIndex,
    onUpdateScene,
    onRegenerateImage,
    onGenerateVideo,
    onUploadImage,
    onRemoveScene,
    onAddScene,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: GridViewProps) {
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
                    onRegenerateImage={() => onRegenerateImage(index)}
                    onGenerateVideo={() => onGenerateVideo(index)}
                    onUploadImage={(file) => onUploadImage(index, file)}
                    onRemoveScene={() => onRemoveScene(index)}
                    isGenerating={generatingScenes.has(index)}
                    canDelete={scenes.length > 1}
                    displayMode={displayMode}
                    isDragOver={dragOverIndex === index}
                    onDragStart={onDragStart(index)}
                    onDragEnd={onDragEnd}
                    onDragOver={onDragOver(index)}
                    onDrop={onDrop(index)}
                />
            ))}
            <Card
                className="cursor-pointer overflow-hidden border-2 border-dashed transition-colors hover:bg-accent/50"
                onClick={onAddScene}
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
}
