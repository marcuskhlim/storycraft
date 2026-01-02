"use client";

import React from "react";
import { useCreateTabState } from "../hooks/use-create-tab-state";
import { CreateHeader } from "./create-header";
import { StoryBasicsForm } from "./story-basics-form";
import { FormatSelector } from "./format-selector";
import { VideoConfigForm } from "./video-config-form";
import { VisualStyleSelector } from "./visual-style-selector";

export const CreateTab = React.memo(function CreateTab() {
    const {
        name,
        setName,
        pitch,
        setPitch,
        numScenes,
        setNumScenes,
        style,
        setStyle,
        aspectRatio,
        setAspectRatio,
        durationSeconds,
        setDurationSeconds,
        language,
        setLanguage,
        styleImageUri,
        setStyleImageUri,
        errorMessage,
        isLoading,
        totalLength,
        canGenerate,
        handleGenerateScenario,
    } = useCreateTabState();

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            <CreateHeader
                isLoading={isLoading}
                onGenerate={() => handleGenerateScenario()}
                canGenerate={canGenerate}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StoryBasicsForm
                    name={name}
                    setName={setName}
                    pitch={pitch}
                    setPitch={setPitch}
                    language={language}
                    setLanguage={setLanguage}
                />

                <div className="flex flex-col gap-6 md:col-span-3 lg:col-span-1">
                    <FormatSelector
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                    />

                    <VideoConfigForm
                        numScenes={numScenes}
                        setNumScenes={setNumScenes}
                        durationSeconds={durationSeconds}
                        setDurationSeconds={setDurationSeconds}
                        totalLength={totalLength}
                    />
                </div>
            </div>

            <VisualStyleSelector
                style={style}
                setStyle={setStyle}
                styleImageUri={styleImageUri}
                setStyleImageUri={setStyleImageUri}
            />

            {errorMessage && (
                <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive shadow-sm animate-in fade-in slide-in-from-top-4">
                    {errorMessage}
                </div>
            )}
        </div>
    );
});
