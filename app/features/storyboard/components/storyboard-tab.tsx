"use client";

import React from "react";
import { StoryboardHeader } from "./storyboard-header";
import { GridView } from "./grid-view";
import { ListView } from "./list-view";
import { SlideshowView } from "./slideshow-view";
import { useStoryboardTabState } from "@/app/features/storyboard/hooks/use-storyboard-tab-state";

export const StoryboardTab = React.memo(function StoryboardTab() {
    const {
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
    } = useStoryboardTabState();

    if (!scenario) return null;

    const renderScenes = () => {
        const commonProps = {
            scenes: scenario.scenes,
            scenario,
            displayMode,
            generatingScenes,
            dragOverIndex,
            onUpdateScene: handleUpdateScene,
            onRegenerateImage: handleRegenerateImage,
            onGenerateVideo: handleGenerateVideo,
            onUploadImage: handleUploadImage,
            onRemoveScene: handleRemoveScene,
            onAddScene: handleAddScene,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragOver: handleDragOver,
            onDrop: handleDrop,
        };

        switch (viewMode) {
            case "grid":
                return <GridView {...commonProps} />;
            case "list":
                return <ListView {...commonProps} />;
            case "slideshow":
                return (
                    <SlideshowView
                        scenes={scenario.scenes}
                        scenario={scenario}
                        displayMode={displayMode}
                        onAddScene={handleAddScene}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            <StoryboardHeader
                viewMode={viewMode}
                setViewMode={setViewMode}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                isVideoLoading={isVideoLoading}
                onGenerateAllVideos={() => handleGenerateAllVideos()}
                hasScenes={scenario.scenes.length > 0}
                isAnySceneGenerating={isAnySceneGenerating}
            />

            {renderScenes()}

            {errorMessage && (
                <div className="mt-4 whitespace-pre-wrap rounded border border-red-400 bg-red-100 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}
        </div>
    );
});
