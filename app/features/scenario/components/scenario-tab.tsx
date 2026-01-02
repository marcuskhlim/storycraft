"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useScenarioTabState } from "@/app/features/scenario/hooks/use-scenario-tab-state";
import { ScenarioHeader } from "./scenario-header";
import { ScenarioDescriptionEditor } from "./scenario-description-editor";
import { CharacterCard } from "./character-card";
import { SettingCard } from "./setting-card";
import { PropCard } from "./prop-card";
import { MusicEditor } from "./music-editor";

export const ScenarioTab = React.memo(function ScenarioTab() {
    const {
        scenario,
        isGeneratingStoryboard,
        handleGenerateStoryBoard,
        handleUpdateScenarioDescription,
        handleUpdateMusic,
        // Characters
        isCharacterLoading,
        handleUpdateCharacter,
        handleAddCharacter,
        handleRemoveCharacter,
        handleRegenerateCharacterImage,
        handleUploadCharacterImage,
        newCharacterIndex,
        // Settings
        isSettingLoading,
        handleUpdateSetting,
        handleAddSetting,
        handleRemoveSetting,
        handleRegenerateSettingImage,
        handleUploadSettingImage,
        newSettingIndex,
        // Props
        isPropLoading,
        handleUpdateProp,
        handleAddProp,
        handleRemoveProp,
        handleRegeneratePropImage,
        handleUploadPropImage,
        newPropIndex,
    } = useScenarioTabState();

    if (!scenario) return null;

    return (
        <div className="space-y-8">
            <div className="mx-auto max-w-5xl space-y-8 pb-10">
                <ScenarioHeader
                    isLoading={isGeneratingStoryboard}
                    onGenerateStoryboard={() => handleGenerateStoryBoard()}
                />

                <div className="mx-auto max-w-4xl space-y-8">
                    <ScenarioDescriptionEditor
                        description={scenario.scenario}
                        onSave={handleUpdateScenarioDescription}
                    />

                    {/* Characters Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Characters</h3>
                            <Button
                                onClick={handleAddCharacter}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Character
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {scenario.characters.map((character, index) => (
                                <CharacterCard
                                    key={`char-${index}`}
                                    character={character}
                                    index={index}
                                    isLoading={isCharacterLoading(index)}
                                    onUpdate={handleUpdateCharacter}
                                    onRemove={handleRemoveCharacter}
                                    onRegenerateImage={
                                        handleRegenerateCharacterImage
                                    }
                                    onUploadImage={handleUploadCharacterImage}
                                    isInitiallyEditing={
                                        newCharacterIndex === index
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    {/* Props Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Props</h3>
                            <Button
                                onClick={handleAddProp}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Prop
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {scenario.props?.map((prop, index) => (
                                <PropCard
                                    key={`prop-${index}`}
                                    prop={prop}
                                    index={index}
                                    isLoading={isPropLoading(index)}
                                    onUpdate={handleUpdateProp}
                                    onRemove={handleRemoveProp}
                                    onRegenerateImage={
                                        handleRegeneratePropImage
                                    }
                                    onUploadImage={handleUploadPropImage}
                                    isInitiallyEditing={newPropIndex === index}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Settings Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Settings</h3>
                            <Button
                                onClick={handleAddSetting}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Setting
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {scenario.settings.map((setting, index) => (
                                <SettingCard
                                    key={`setting-${index}`}
                                    setting={setting}
                                    index={index}
                                    isLoading={isSettingLoading(index)}
                                    onUpdate={handleUpdateSetting}
                                    onRemove={handleRemoveSetting}
                                    onRegenerateImage={
                                        handleRegenerateSettingImage
                                    }
                                    onUploadImage={handleUploadSettingImage}
                                    isInitiallyEditing={
                                        newSettingIndex === index
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    <MusicEditor
                        music={scenario.music}
                        onSave={handleUpdateMusic}
                    />
                </div>
            </div>
        </div>
    );
});
