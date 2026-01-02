"use client";

import { memo, useCallback } from "react";
import { EntityCard } from "./entity-card";

interface Setting {
    name: string;
    description: string;
    imageGcsUri?: string;
    [key: string]: string | number | boolean | undefined | null;
}

interface SettingCardProps {
    setting: Setting;
    index: number;
    isLoading: boolean;
    onUpdate: (index: number, updatedSetting: Setting) => void;
    onRemove: (index: number) => void;
    onRegenerateImage: (
        index: number,
        name: string,
        description: string,
    ) => void;
    onUploadImage: (index: number, file: File) => void;
    isInitiallyEditing?: boolean;
}

export const SettingCard = memo(function SettingCard({
    setting,
    index,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
}: SettingCardProps) {
    const handleRegenerate = useCallback(
        (idx: number, s: Setting) => {
            onRegenerateImage(idx, s.name, s.description);
        },
        [onRegenerateImage],
    );

    return (
        <EntityCard
            entity={setting}
            index={index}
            title="Setting"
            entityType="setting"
            isLoading={isLoading}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onRegenerateImage={handleRegenerate}
            onUploadImage={onUploadImage}
            isInitiallyEditing={isInitiallyEditing}
        />
    );
});
