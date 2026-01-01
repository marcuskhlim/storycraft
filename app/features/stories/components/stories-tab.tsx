"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { useAuth } from "@/app/features/shared/hooks/use-auth";
import { BookOpen, Calendar, Clock, Play, Plus, Trash2 } from "lucide-react";
import { Scenario } from "@/app/types";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";

interface StoriesTabProps {
    onSelectScenario: (scenario: Scenario, scenarioId?: string) => void;
    onCreateNewStory: () => void;
}

export function StoriesTab({
    onSelectScenario,
    onCreateNewStory,
}: StoriesTabProps) {
    const [scenarios, setScenarios] = useState<
        (Scenario & { id: string; updatedAt?: unknown })[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { loadUserScenarios, setCurrentScenarioId } = useScenario();
    const { session } = useAuth();

    const loadScenarios = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const userScenarios = await loadUserScenarios();
            setScenarios(userScenarios);
        } catch (err) {
            setError("Failed to load your stories");
            console.error("Error loading scenarios:", err);
        } finally {
            setLoading(false);
        }
    }, [loadUserScenarios]);

    useEffect(() => {
        if (session?.user?.id) {
            loadScenarios();
        }
    }, [session?.user?.id, loadScenarios]);

    const handleSelectScenario = (scenario: Scenario & { id: string }) => {
        // Set the current scenario ID for future saves
        setCurrentScenarioId(scenario.id);

        // Convert Firestore data back to app format
        const appScenario: Scenario = {
            name: scenario.name,
            pitch: scenario.pitch,
            scenario: scenario.scenario,
            style: scenario.style,
            aspectRatio: scenario.aspectRatio || "16:9",
            durationSeconds: scenario.durationSeconds || 8,
            genre: scenario.genre,
            mood: scenario.mood,
            music: scenario.music,
            language: scenario.language,
            characters: scenario.characters,
            props: scenario.props,
            settings: scenario.settings,
            scenes: scenario.scenes,
            musicUrl: scenario.musicUrl,
            logoOverlay: scenario.logoOverlay,
        };

        // Pass both the scenario and its ID
        onSelectScenario(appScenario, scenario.id);
    };

    const deleteScenario = async (scenarioId: string) => {
        try {
            const response = await fetch(`/api/scenarios?id=${scenarioId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete scenario");
            }

            // Refresh the list
            await loadScenarios();
        } catch (err) {
            console.error("Error deleting scenario:", err);
            setError("Failed to delete story");
        }
    };

    const formatDate = (timestamp: unknown) => {
        if (!timestamp) return "Unknown";

        let date: Date;
        // Type assertion to access potential properties safely
        const ts = timestamp as { toDate?: () => Date; _seconds?: number };

        if (typeof ts.toDate === "function") {
            // Firestore Timestamp
            date = ts.toDate();
        } else if (typeof ts._seconds === "number") {
            // Firestore Timestamp object
            date = new Date(ts._seconds * 1000);
        } else {
            // Regular Date or string
            date = new Date(timestamp as string | number | Date);
        }

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (!session?.user?.id) {
        return (
            <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                    Sign in to view your stories
                </h3>
                <p className="text-muted-foreground">
                    Create an account to save and manage your story scenarios.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading your stories...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-12 text-center">
                <div className="mb-4 text-red-500">
                    <BookOpen className="mx-auto mb-2 h-12 w-12" />
                    <p>{error}</p>
                </div>
                <Button onClick={loadScenarios} variant="outline">
                    Try Again
                </Button>
            </div>
        );
    }

    if (scenarios.length === 0) {
        return (
            <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No stories yet</h3>
                <p className="mb-4 text-muted-foreground">
                    Create your first story to get started!
                </p>
                <Button onClick={onCreateNewStory}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Story
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Your Stories</h2>
                    <p className="text-muted-foreground">
                        Select a story to continue working on it or create a new
                        one
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={onCreateNewStory} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Story
                    </Button>
                    <Button onClick={loadScenarios} variant="outline" size="sm">
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Create New Story Card */}
                <Card
                    className="cursor-pointer border-2 border-dashed border-primary/30 transition-shadow hover:border-primary/50 hover:shadow-lg"
                    onClick={onCreateNewStory}
                >
                    <CardHeader className="pb-3">
                        <div className="flex h-24 items-center justify-center">
                            <div className="text-center">
                                <Plus className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <CardTitle className="text-lg text-primary">
                                    Create New Story
                                </CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-center">
                            <p className="mb-3 text-sm text-muted-foreground">
                                Start fresh with a new story idea
                            </p>
                            <Button size="sm" className="w-full">
                                Get Started
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {scenarios.map((scenario) => (
                    <Card
                        key={scenario.id}
                        className="transition-shadow hover:shadow-lg"
                    >
                        <CardHeader className="pb-3">
                            {/* Scene Image */}
                            {scenario.scenes?.[0]?.imageGcsUri && (
                                <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
                                    <GcsImage
                                        gcsUri={scenario.scenes[0].imageGcsUri}
                                        alt={`${scenario.name || "Story"} preview`}
                                        className="object-cover"
                                        fill={true}
                                    />
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="line-clamp-2 text-lg">
                                        {scenario.name || "Untitled Story"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {scenario.style && (
                                            <span className="mr-2 inline-block rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                                {scenario.style}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                            confirm(
                                                "Are you sure you want to delete this story?",
                                            )
                                        ) {
                                            deleteScenario(scenario.id);
                                        }
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="mr-2 h-4 w-4" />
                                    <span>
                                        {scenario.scenes?.length || 0} scenes
                                    </span>
                                </div>

                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>
                                        Updated {formatDate(scenario.updatedAt)}
                                    </span>
                                </div>

                                <Button
                                    onClick={() =>
                                        handleSelectScenario(scenario)
                                    }
                                    className="w-full"
                                    size="sm"
                                >
                                    <Play className="mr-2 h-4 w-4" />
                                    Continue Story
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
