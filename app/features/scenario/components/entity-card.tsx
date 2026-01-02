"use client";

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    memo,
    ReactNode,
} from "react";
import { Loader2, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";
import { useFileUpload } from "@/app/features/shared/hooks/use-file-upload";
import { Entity } from "@/app/types";

interface EntityCardProps<T extends Entity> {
    entity: T;
    index: number;
    title: string;
    entityType: string;
    isLoading: boolean;
    onUpdate: (index: number, updatedEntity: T) => void;
    onRemove: (index: number) => void;
    onRegenerateImage: (index: number, entity: T) => void;
    onUploadImage: (index: number, file: File) => void;
    isInitiallyEditing?: boolean;
    renderExtraFields?: (
        editedEntity: T,
        setEditedEntity: (entity: T) => void,
    ) => ReactNode;
    renderExtraDisplay?: (entity: T) => ReactNode;
}

export const EntityCard = memo(function EntityCard<T extends Entity>({
    entity,
    index,
    title,
    entityType,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
    renderExtraFields,
    renderExtraDisplay,
}: EntityCardProps<T>) {
    const [isEditing, setIsEditing] = useState(isInitiallyEditing);
    const [editedEntity, setEditedEntity] = useState<T>(entity);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { fileInputRef, handleUploadClick, handleFileChange, accept } =
        useFileUpload({
            onFileSelect: (file) => onUploadImage(index, file),
        });

    // Sync state with props when props change and NOT editing
    const [prevEntity, setPrevEntity] = useState(entity);
    if (entity !== prevEntity) {
        setPrevEntity(entity);
        if (!isEditing) {
            setEditedEntity(entity);
        }
    }

    const handleSave = useCallback(() => {
        const hasChanged = Object.keys(editedEntity).some(
            (key) => editedEntity[key] !== entity[key],
        );

        if (hasChanged) {
            onUpdate(index, editedEntity);
        }
        setIsEditing(false);
    }, [editedEntity, entity, index, onUpdate]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                if (isEditing) {
                    handleSave();
                }
            }
        }

        if (isEditing) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isEditing, handleSave]);

    return (
        <div className="flex items-start gap-4">
            <div className="group relative h-[200px] w-[200px] flex-shrink-0">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
                <GcsImage
                    gcsUri={entity.imageGcsUri || null}
                    alt={`${title} ${entity.name}`}
                    className="rounded-lg object-cover shadow-md"
                    sizes="200px"
                />
                <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-blue-500 hover:text-white"
                        onClick={() => onRegenerateImage(index, entity)}
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="sr-only">
                            Regenerate {entityType} image
                        </span>
                    </Button>
                </div>
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-green-500 hover:text-white"
                        onClick={handleUploadClick}
                        disabled={isLoading}
                    >
                        <Upload className="h-4 w-4" />
                        <span className="sr-only">
                            Upload {entityType} image
                        </span>
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-red-500 hover:text-white"
                        onClick={() => onRemove(index)}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove {entityType}</span>
                    </Button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={accept}
                    className="hidden"
                />
            </div>
            <div
                ref={containerRef}
                className="group relative flex-grow"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {!isEditing && isHovering && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="absolute right-2 top-0 z-10 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                )}
                {isEditing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                {title} Name
                            </label>
                            <Input
                                value={editedEntity.name}
                                onChange={(e) =>
                                    setEditedEntity({
                                        ...editedEntity,
                                        name: e.target.value,
                                    })
                                }
                                placeholder={`Enter ${entityType} name...`}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                {title} Description
                            </label>
                            <Textarea
                                value={editedEntity.description}
                                onChange={(e) =>
                                    setEditedEntity({
                                        ...editedEntity,
                                        description: e.target.value,
                                    })
                                }
                                className="min-h-[100px] w-full"
                                placeholder={`Enter ${entityType} description...`}
                            />
                        </div>
                        {renderExtraFields?.(editedEntity, setEditedEntity)}
                    </div>
                ) : (
                    <div>
                        <h4 className="mb-2 text-lg font-semibold">
                            {entity.name}
                        </h4>
                        <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                            {entity.description}
                        </p>
                        {renderExtraDisplay?.(entity)}
                    </div>
                )}
            </div>
        </div>
    );
});
