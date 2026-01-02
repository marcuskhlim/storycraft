"use client";

import { memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { EntityCard } from "./entity-card";
import { Character } from "@/app/types";

interface CharacterCardProps {
    character: Character;
    index: number;
    isLoading: boolean;
    onUpdate: (index: number, updatedCharacter: Character) => void;
    onRemove: (index: number) => void;
    onRegenerateImage: (
        index: number,
        name: string,
        description: string,
        voice: string,
    ) => void;
    onUploadImage: (index: number, file: File) => void;
    isInitiallyEditing?: boolean;
}

export const CharacterCard = memo(function CharacterCard({
    character,
    index,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
}: CharacterCardProps) {
    const handleRegenerate = useCallback(
        (idx: number, char: Character) => {
            onRegenerateImage(
                idx,
                char.name,
                char.description,
                char.voice || "",
            );
        },
        [onRegenerateImage],
    );

    const renderExtraFields = useCallback(
        (
            editedEntity: Character,
            setEditedEntity: (char: Character) => void,
        ) => (
            <div>
                <label className="mb-1 block text-sm font-medium">Voice</label>
                <Input
                    value={editedEntity.voice || ""}
                    onChange={(e) =>
                        setEditedEntity({
                            ...editedEntity,
                            voice: e.target.value,
                        })
                    }
                    placeholder="Enter voice description..."
                />
            </div>
        ),
        [],
    );

    const renderExtraDisplay = useCallback(
        (entity: Character) => (
            <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                Voice: {entity.voice}
            </p>
        ),
        [],
    );

    return (
        <EntityCard
            entity={character}
            index={index}
            title="Character"
            entityType="character"
            isLoading={isLoading}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onRegenerateImage={handleRegenerate}
            onUploadImage={onUploadImage}
            isInitiallyEditing={isInitiallyEditing}
            renderExtraFields={renderExtraFields}
            renderExtraDisplay={renderExtraDisplay}
        />
    );
});
