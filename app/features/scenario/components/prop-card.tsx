"use client";

import { memo, useCallback } from "react";
import { EntityCard } from "./entity-card";

interface Prop {
    name: string;
    description: string;
    imageGcsUri?: string;
    [key: string]: string | number | boolean | undefined | null;
}

interface PropCardProps {
    prop: Prop;
    index: number;
    isLoading: boolean;
    onUpdate: (index: number, updatedProp: Prop) => void;
    onRemove: (index: number) => void;
    onRegenerateImage: (
        index: number,
        name: string,
        description: string,
    ) => void;
    onUploadImage: (index: number, file: File) => void;
    isInitiallyEditing?: boolean;
}

export const PropCard = memo(function PropCard({
    prop,
    index,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
}: PropCardProps) {
    const handleRegenerate = useCallback(
        (idx: number, p: Prop) => {
            onRegenerateImage(idx, p.name, p.description);
        },
        [onRegenerateImage],
    );

    return (
        <EntityCard
            entity={prop}
            index={index}
            title="Prop"
            entityType="prop"
            isLoading={isLoading}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onRegenerateImage={handleRegenerate}
            onUploadImage={onUploadImage}
            isInitiallyEditing={isInitiallyEditing}
        />
    );
});
