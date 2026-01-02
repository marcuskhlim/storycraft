"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ScenarioDescriptionEditorProps {
    description: string;
    onSave: (newDescription: string) => void;
}

export const ScenarioDescriptionEditor = memo(
    function ScenarioDescriptionEditor({
        description,
        onSave,
    }: ScenarioDescriptionEditorProps) {
        const [isEditing, setIsEditing] = useState(false);
        const [editedDescription, setEditedDescription] = useState(description);
        const [isHovering, setIsHovering] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            setEditedDescription(description);
        }, [description]);

        const handleSave = useCallback(() => {
            if (editedDescription !== description) {
                onSave(editedDescription);
            }
            setIsEditing(false);
        }, [editedDescription, description, onSave]);

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
            <div className="mx-auto max-w-4xl space-y-4">
                <div className="col-span-1">
                    <h3 className="text-xl font-bold">Scenario</h3>
                </div>
                <div
                    ref={containerRef}
                    className="group relative"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {!isEditing && isHovering && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute right-2 top-2 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                    {isEditing ? (
                        <Textarea
                            value={editedDescription}
                            onChange={(e) =>
                                setEditedDescription(e.target.value)
                            }
                            className="min-h-[200px] w-full"
                            placeholder="Enter your scenario..."
                            autoFocus
                        />
                    ) : (
                        <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        );
    },
);
