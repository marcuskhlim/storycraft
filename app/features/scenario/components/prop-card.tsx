"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";

interface Prop {
    name: string;
    description: string;
    imageGcsUri?: string;
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

export function PropCard({
    prop,
    index,
    isLoading,
    onUpdate,
    onRemove,
    onRegenerateImage,
    onUploadImage,
    isInitiallyEditing = false,
}: PropCardProps) {
    const [isEditing, setIsEditing] = useState(isInitiallyEditing);
    const [editedName, setEditedName] = useState(prop.name);
    const [editedDescription, setEditedDescription] = useState(
        prop.description,
    );
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state with props when props change and NOT editing
    const [prevProp, setPrevProp] = useState(prop);
    if (prop !== prevProp) {
        setPrevProp(prop);
        if (!isEditing) {
            setEditedName(prop.name);
            setEditedDescription(prop.description);
        }
    }

    const handleSave = useCallback(() => {
        if (
            editedName !== prop.name ||
            editedDescription !== prop.description
        ) {
            onUpdate(index, {
                ...prop,
                name: editedName,
                description: editedDescription,
            });
        }
        setIsEditing(false);
    }, [editedName, editedDescription, prop, index, onUpdate]);

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
                    gcsUri={prop.imageGcsUri || null}
                    alt={`Prop ${prop.name}`}
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
                                prop.name,
                                prop.description,
                            )
                        }
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="sr-only">Regenerate prop image</span>
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
                        <span className="sr-only">Upload prop image</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-black/50 hover:bg-red-500 hover:text-white"
                        onClick={() => onRemove(index)}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove prop</span>
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
                                Prop Name
                            </label>
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                placeholder="Enter prop name..."
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Prop Description
                            </label>
                            <Textarea
                                value={editedDescription}
                                onChange={(e) =>
                                    setEditedDescription(e.target.value)
                                }
                                className="min-h-[100px] w-full"
                                placeholder="Enter prop description..."
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <h4 className="mb-2 text-lg font-semibold">
                            {prop.name}
                        </h4>
                        <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                            {prop.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
