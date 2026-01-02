"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";

interface Character {
    name: string;
    description: string;
    voice?: string;
    imageGcsUri?: string;
}

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

export function CharacterCard({
    character,
    index,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
}: CharacterCardProps) {
    const [isEditing, setIsEditing] = useState(isInitiallyEditing);
    const [editedName, setEditedName] = useState(character.name);
    const [editedDescription, setEditedDescription] = useState(
        character.description,
    );
    const [editedVoice, setEditedVoice] = useState(character.voice || "");
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state with props when props change and NOT editing
    const [prevCharacter, setPrevCharacter] = useState(character);
    if (character !== prevCharacter) {
        setPrevCharacter(character);
        if (!isEditing) {
            setEditedName(character.name);
            setEditedDescription(character.description);
            setEditedVoice(character.voice || "");
        }
    }

    const handleSave = useCallback(() => {
        if (
            editedName !== character.name ||
            editedDescription !== character.description ||
            editedVoice !== (character.voice || "")
        ) {
            onUpdate(index, {
                ...character,
                name: editedName,
                description: editedDescription,
                voice: editedVoice,
            });
        }
        setIsEditing(false);
    }, [
        editedName,
        editedDescription,
        editedVoice,
        character,
        index,
        onUpdate,
    ]);

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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            onUploadImage(index, file);
        }
    };

    return (
        <div className="flex items-start gap-4">
            <div className="group relative h-[200px] w-[200px] flex-shrink-0">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
                <GcsImage
                    gcsUri={character.imageGcsUri || null}
                    alt={`Character ${character.name}`}
                    className="rounded-lg object-cover shadow-md"
                    sizes="200px"
                />
                <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-blue-500 hover:text-white"
                        onClick={() =>
                            onRegenerateImage(
                                index,
                                character.name,
                                character.description,
                                character.voice || "",
                            )
                        }
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="sr-only">
                            Regenerate character image
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
                        <span className="sr-only">Upload character image</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-red-500 hover:text-white"
                        onClick={() => onRemove(index)}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove character</span>
                    </Button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
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
                                Character Name
                            </label>
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                placeholder="Enter character name..."
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Character Description
                            </label>
                            <Textarea
                                value={editedDescription}
                                onChange={(e) =>
                                    setEditedDescription(e.target.value)
                                }
                                className="min-h-[100px] w-full"
                                placeholder="Enter character description..."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Voice
                            </label>
                            <Input
                                value={editedVoice}
                                onChange={(e) => setEditedVoice(e.target.value)}
                                placeholder="Enter voice description..."
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <h4 className="mb-2 text-lg font-semibold">
                            {character.name}
                        </h4>
                        <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                            {character.description}
                        </p>
                        <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                            Voice: {character.voice}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
