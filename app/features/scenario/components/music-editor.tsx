"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface MusicEditorProps {
    music: string;
    onSave: (newMusic: string) => void;
}

export function MusicEditor({ music, onSave }: MusicEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedMusic, setEditedMusic] = useState(music);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEditedMusic(music);
    }, [music]);

    const handleSave = useCallback(() => {
        if (editedMusic !== music) {
            onSave(editedMusic);
        }
        setIsEditing(false);
    }, [editedMusic, music, onSave]);

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
        <div className="space-y-4">
            <div className="col-span-1">
                <h3 className="text-xl font-bold">Music</h3>
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
                        value={editedMusic}
                        onChange={(e) => setEditedMusic(e.target.value)}
                        className="min-h-[100px] w-full"
                        placeholder="Enter music description..."
                        autoFocus
                    />
                ) : (
                    <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                        {music}
                    </p>
                )}
            </div>
        </div>
    );
}
