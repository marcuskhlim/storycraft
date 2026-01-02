"use client";

import { useState } from "react";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useStoryboardActions } from "@/app/features/storyboard/hooks/use-storyboard-actions";

export type ViewMode = "grid" | "list" | "slideshow";
export type DisplayMode = "image" | "video";

export function useStoryboardTabState() {
    const { scenario, errorMessage } = useScenarioStore();
    const { video: isVideoLoading, scenes: generatingScenes } =
        useLoadingStore();

    const {
        handleRegenerateImage,
        handleGenerateAllVideos,
        handleGenerateVideo,
        handleUpdateScene,
        handleUploadImage,
        handleAddScene,
        handleRemoveScene,
        handleReorderScenes,
    } = useStoryboardActions();

    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("image");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
            handleReorderScenes(draggedIndex, index);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const isAnySceneGenerating = generatingScenes.size > 0;

    return {
        scenario,
        errorMessage,
        isVideoLoading,
        generatingScenes,
        viewMode,
        setViewMode,
        displayMode,
        setDisplayMode,
        dragOverIndex,
        isAnySceneGenerating,
        // Actions
        handleRegenerateImage,
        handleGenerateAllVideos,
        handleGenerateVideo,
        handleUpdateScene,
        handleUploadImage,
        handleAddScene,
        handleRemoveScene,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
    };
}
