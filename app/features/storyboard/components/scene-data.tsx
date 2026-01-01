"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Loader2,
    Pencil,
    RefreshCw,
    Upload,
    Video,
    Trash2,
    GripVertical,
    MessageCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { Scene, Scenario } from "@/app/types";
import { EditSceneModal } from "./edit-scene-modal";
import { ConversationalEditModal } from "./conversational-edit-modal";
import { VideoPlayer } from "@/app/features/editor/components/video-player";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";
import { cn } from "@/lib/utils/utils";

interface SceneDataProps {
    scene: Scene;
    sceneNumber: number;
    scenario: Scenario;
    onUpdate: (updatedScene: SceneDataProps["scene"]) => void;
    onRegenerateImage: () => void;
    onGenerateVideo: () => void;
    onUploadImage: (file: File) => void;
    onRemoveScene: () => void;
    isGenerating: boolean;
    canDelete: boolean;
    displayMode?: "image" | "video";
    hideControls?: boolean;
    isDragOver?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

export function SceneData({
    scene,
    sceneNumber,
    scenario,
    onUpdate,
    onRegenerateImage,
    onGenerateVideo,
    onUploadImage,
    onRemoveScene,
    isGenerating,
    canDelete,
    displayMode = "image",
    hideControls = false,
    isDragOver = false,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: SceneDataProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConversationalEditOpen, setIsConversationalEditOpen] =
        useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUploadImage(file);
        }
    };

    return (
        <Card
            className={cn(
                "overflow-hidden transition-all duration-200",
                isDragOver && "bg-blue-50 ring-2 ring-blue-500",
                "hover:shadow-lg",
            )}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="flex flex-col">
                <div className="group relative aspect-[11/6] w-full overflow-hidden">
                    {isGenerating && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                    {displayMode === "video" && scene.videoUri ? (
                        <div className="absolute inset-0">
                            <VideoPlayer
                                videoGcsUri={scene.videoUri}
                                aspectRatio={scenario.aspectRatio}
                            />
                        </div>
                    ) : (
                        <GcsImage
                            gcsUri={scene.imageGcsUri || null}
                            alt={`Scene ${sceneNumber}`}
                            className="absolute inset-0 h-full w-full rounded-t-lg object-contain object-center"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    )}
                    {!hideControls && (
                        <>
                            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-black/50 hover:bg-blue-500 hover:text-white"
                                    onClick={onGenerateVideo}
                                    disabled={isGenerating}
                                >
                                    <Video className="h-4 w-4" />
                                    <span className="sr-only">
                                        Generate video for scene
                                    </span>
                                </Button>
                            </div>
                            <div className="absolute left-2 top-2 flex space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-black/50 hover:bg-red-500 hover:text-white"
                                    onClick={onRegenerateImage}
                                    disabled={isGenerating}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    <span className="sr-only">
                                        Regenerate image
                                    </span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-black/50 hover:bg-green-500 hover:text-white"
                                    onClick={handleUploadClick}
                                    disabled={isGenerating}
                                >
                                    <Upload className="h-4 w-4" />
                                    <span className="sr-only">
                                        Upload image
                                    </span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-black/50 hover:bg-purple-500 hover:text-white"
                                    onClick={() =>
                                        setIsConversationalEditOpen(true)
                                    }
                                    disabled={isGenerating}
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="sr-only">
                                        Conversational edit
                                    </span>
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                            {canDelete && (
                                <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="bg-black/50 hover:bg-red-500 hover:text-white"
                                        onClick={onRemoveScene}
                                        disabled={isGenerating}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">
                                            Delete scene
                                        </span>
                                    </Button>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <div
                                    className="cursor-grab select-none rounded bg-black/50 p-1.5 transition-colors hover:bg-blue-500 hover:text-white active:cursor-grabbing"
                                    style={{ touchAction: "none" }}
                                    title="Drag to reorder scene"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <GripVertical className="h-3 w-3 text-white" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-primary">
                            Scene {sceneNumber}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditModalOpen(true)}
                            className="text-secondary hover:bg-primary/10 hover:text-primary"
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </div>
                    {scene.errorMessage && (
                        <p className="text-sm text-red-600">
                            {scene.errorMessage}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {scene.description}
                    </p>
                </CardContent>
            </div>
            <EditSceneModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                scene={scene}
                sceneNumber={sceneNumber}
                scenario={scenario}
                onUpdate={onUpdate}
                displayMode={displayMode}
            />
            <ConversationalEditModal
                isOpen={isConversationalEditOpen}
                onClose={() => setIsConversationalEditOpen(false)}
                scene={scene}
                sceneNumber={sceneNumber}
                scenario={scenario}
                onUpdate={onUpdate}
            />
        </Card>
    );
}
