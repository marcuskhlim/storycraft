'use client'

import { Button } from "@/components/ui/button"
import { Loader2, Pencil, RefreshCw, Upload, Video, Trash2, GripVertical, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Scene, Scenario } from '../../types'
import { EditSceneModal } from './edit-scene-modal'
import { ConversationalEditModal } from './conversational-edit-modal'
import { VideoPlayer } from "../video/video-player"
import { GcsImage } from "../ui/gcs-image"
import { cn } from "@/lib/utils"

interface SceneCardProps {
    scene: Scene;
    sceneNumber: number;
    scenario: Scenario;
    onUpdate: (updatedScene: Scene) => void;
    onRegenerateImage: () => void;
    onGenerateVideo: () => void;
    onUploadImage: (file: File) => void;
    onRemoveScene: () => void;
    isGenerating: boolean;
    canDelete: boolean;
    displayMode?: 'image' | 'video';
    hideControls?: boolean;
    isDragOver?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

export function SceneCard({
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
    displayMode = 'image',
    hideControls = false,
    isDragOver = false,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: SceneCardProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isConversationalEditOpen, setIsConversationalEditOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            onUploadImage(file)
        }
    }

    return (
        <div
            className={cn(
                "group relative rounded-[20px] bg-card border border-border/10 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1",
                isDragOver && "ring-2 ring-primary bg-primary/5"
            )}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {/* Helper for Dragging - only visible on hover */}
            {!hideControls && (
                <div className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                        className="bg-black/40 hover:bg-primary/80 text-white p-2 rounded-full cursor-grab active:cursor-grabbing backdrop-blur-md"
                        title="Drag to reorder"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                </div>
            )}

            {/* Media Area */}
            <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-[20px] bg-muted/20">
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                )}

                {displayMode === 'video' && scene.videoUri ? (
                    <VideoPlayer videoGcsUri={scene.videoUri} aspectRatio={scenario.aspectRatio} />
                ) : (
                    <GcsImage
                        gcsUri={scene.imageGcsUri || null}
                        alt={`Scene ${sceneNumber}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                )}

                {/* Overlay Actions */}
                {!hideControls && (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border-0"
                                onClick={onRegenerateImage}
                                disabled={isGenerating}
                                title="Regenerate Image"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border-0"
                                onClick={handleUploadClick}
                                disabled={isGenerating}
                                title="Upload Image"
                            >
                                <Upload className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border-0"
                                onClick={() => setIsConversationalEditOpen(true)}
                                disabled={isGenerating}
                                title="Magic Edit"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-primary/80 hover:bg-primary text-white border-0 shadow-sm"
                                onClick={onGenerateVideo}
                                disabled={isGenerating}
                                title="Generate Video"
                            >
                                <Video className="h-3.5 w-3.5" />
                            </Button>
                            {canDelete && (
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600 text-white border-0"
                                    onClick={onRemoveScene}
                                    disabled={isGenerating}
                                    title="Delete Scene"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            {/* Content Area */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg text-foreground px-3 py-1 bg-secondary/30 rounded-full text-secondary-foreground">
                        Scene {sceneNumber}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full px-3"
                    >
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                    </Button>
                </div>

                {scene.errorMessage && (
                    <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                        {scene.errorMessage}
                    </div>
                )}

                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {scene.description}
                </p>
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
        </div>
    )
}
