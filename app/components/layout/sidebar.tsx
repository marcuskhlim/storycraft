"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, BookOpen, PanelLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScenario } from "@/hooks/use-scenario";
import { useAuth } from "@/hooks/use-auth";
import { Scenario } from "@/app/types";
import { cn } from "@/lib/utils";
import {
    useSettings,
    LLM_OPTIONS,
    IMAGE_MODEL_OPTIONS,
    VIDEO_MODEL_OPTIONS,
} from "@/hooks/use-settings";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SidebarProps {
    currentScenarioId?: string;
    onSelectScenario: (scenario: Scenario, scenarioId?: string) => void;
    onCreateNewStory: () => void;
    isCollapsed: boolean;
    onToggle: () => void;
    refreshTrigger?: number; // Increment this to trigger a refresh of the scenarios list
}

export function Sidebar({
    currentScenarioId,
    onSelectScenario,
    onCreateNewStory,
    isCollapsed,
    onToggle,
    refreshTrigger,
}: SidebarProps) {
    const { settings, updateSettings } = useSettings();
    const [scenarios, setScenarios] = useState<(Scenario & { id: string })[]>(
        [],
    );
    const { loadUserScenarios, loadScenario, setCurrentScenarioId } =
        useScenario();
    const { session } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const loadScenarios = useCallback(async () => {
        try {
            setIsLoading(true);
            const userScenarios = await loadUserScenarios();
            setScenarios(userScenarios);
        } catch (err) {
            console.error("Error loading scenarios:", err);
        } finally {
            setIsLoading(false);
        }
    }, [loadUserScenarios]);

    useEffect(() => {
        if (session?.user?.id) {
            loadScenarios();
        }
    }, [session?.user?.id, loadScenarios]);

    // Refresh scenarios when refreshTrigger changes
    useEffect(() => {
        if (
            session?.user?.id &&
            refreshTrigger !== undefined &&
            refreshTrigger > 0
        ) {
            loadScenarios();
        }
    }, [refreshTrigger, session?.user?.id, loadScenarios]);

    const handleSelect = async (scenario: Scenario & { id: string }) => {
        setCurrentScenarioId(scenario.id);

        try {
            // Fetch fresh data from Firestore instead of using cached sidebar data
            const freshScenario = await loadScenario(scenario.id);

            if (freshScenario) {
                onSelectScenario(freshScenario, scenario.id);
            } else {
                // Fallback to cached data if fetch fails
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
                    characters: scenario.characters || [],
                    props: scenario.props || [],
                    settings: scenario.settings || [],
                    scenes: scenario.scenes || [],
                    musicUrl: scenario.musicUrl,
                    logoOverlay: scenario.logoOverlay,
                };
                onSelectScenario(appScenario, scenario.id);
            }
        } catch (error) {
            console.error("Error loading fresh scenario:", error);
            // Fallback to cached data if fetch fails
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
                characters: scenario.characters || [],
                props: scenario.props || [],
                settings: scenario.settings || [],
                scenes: scenario.scenes || [],
                musicUrl: scenario.musicUrl,
                logoOverlay: scenario.logoOverlay,
            };
            onSelectScenario(appScenario, scenario.id);
        }
    };

    return (
        <aside
            className={cn(
                "fixed bottom-0 left-0 top-0 z-30 flex h-screen flex-shrink-0 flex-col border-r border-gray-200 bg-card/50 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[70px]" : "w-[280px]",
            )}
        >
            <div className="flex h-16 items-center border-gray-200 px-3 transition-all duration-300">
                {/* Toggle Button - Centered in Rail (46px zone) */}
                <div className="flex w-[46px] shrink-0 justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="text-muted-foreground hover:text-foreground"
                        title={
                            isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                        }
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden px-3 py-4">
                <Button
                    onClick={onCreateNewStory}
                    className={cn(
                        "h-12 w-full justify-start overflow-hidden rounded-2xl bg-primary p-0 text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90",
                    )}
                    title="New Story"
                >
                    {/* Icon Slot - Fixed width to match rail center */}
                    <div className="flex h-full w-[46px] shrink-0 items-center justify-center">
                        <Plus className="h-5 w-5" />
                    </div>
                    <span
                        className={cn(
                            "overflow-hidden whitespace-nowrap transition-all duration-300",
                            isCollapsed
                                ? "w-0 opacity-0"
                                : "w-auto pr-4 opacity-100",
                        )}
                    >
                        New Story
                    </span>
                </Button>
            </div>

            <div className="scrollbar-hide flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3">
                <div
                    className={cn(
                        "flex h-8 items-center overflow-hidden whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted-foreground transition-all duration-300",
                        isCollapsed
                            ? "w-0 opacity-0"
                            : "w-full px-2 opacity-100",
                    )}
                >
                    Your Stories
                </div>

                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-12 w-full animate-pulse rounded-full bg-muted/50"
                            />
                        ))}
                    </div>
                ) : scenarios.length === 0 ? (
                    !isCollapsed && (
                        <div className="whitespace-nowrap px-2 text-sm text-muted-foreground">
                            No stories yet.
                        </div>
                    )
                ) : (
                    scenarios.map((scenario) => (
                        <button
                            key={scenario.id}
                            onClick={() => handleSelect(scenario)}
                            className={cn(
                                "flex h-12 w-full items-center overflow-hidden rounded-full transition-all duration-200",
                                currentScenarioId === scenario.id
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-foreground hover:bg-muted",
                            )}
                            title={scenario.name}
                        >
                            {/* Icon Slot - Fixed width 46px + relative centering */}
                            <div className="flex h-full w-[46px] shrink-0 items-center justify-center">
                                <BookOpen className="h-4 w-4" />
                            </div>

                            <span
                                className={cn(
                                    "truncate text-left transition-all duration-300",
                                    isCollapsed
                                        ? "w-0 opacity-0"
                                        : "w-auto flex-1 pr-4 opacity-100",
                                )}
                            >
                                {scenario.name || "Untitled Story"}
                            </span>
                        </button>
                    ))
                )}
            </div>

            <div className="overflow-hidden border-t border-gray-200 p-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <button
                            className={cn(
                                "mb-2 flex h-12 w-full items-center overflow-hidden rounded-full text-foreground transition-all duration-200 hover:bg-muted",
                            )}
                            title="Settings"
                        >
                            <div className="flex h-full w-[46px] shrink-0 items-center justify-center">
                                <Settings className="h-4 w-4" />
                            </div>
                            <span
                                className={cn(
                                    "truncate text-left transition-all duration-300",
                                    isCollapsed
                                        ? "w-0 opacity-0"
                                        : "w-auto flex-1 pr-4 opacity-100",
                                )}
                            >
                                Settings
                            </span>
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Generation Settings</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                    LLM Model
                                </label>
                                <Select
                                    value={JSON.stringify(
                                        LLM_OPTIONS.find(
                                            (opt) =>
                                                opt.modelName ===
                                                    settings.llmModel &&
                                                opt.thinkingBudget ===
                                                    settings.thinkingBudget,
                                        ),
                                    )}
                                    onValueChange={(value) => {
                                        const opt = JSON.parse(value);
                                        updateSettings({
                                            llmModel: opt.modelName,
                                            thinkingBudget: opt.thinkingBudget,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select LLM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LLM_OPTIONS.map((opt) => (
                                            <SelectItem
                                                key={opt.label}
                                                value={JSON.stringify(opt)}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                    Image Model
                                </label>
                                <Select
                                    value={settings.imageModel}
                                    onValueChange={(value) =>
                                        updateSettings({
                                            imageModel: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Image Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {IMAGE_MODEL_OPTIONS.map((opt) => (
                                            <SelectItem
                                                key={opt.label}
                                                value={opt.modelName}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                    Video Model
                                </label>
                                <Select
                                    value={JSON.stringify(
                                        VIDEO_MODEL_OPTIONS.find(
                                            (opt) =>
                                                opt.modelName ===
                                                    settings.videoModel &&
                                                opt.generateAudio ===
                                                    settings.generateAudio,
                                        ),
                                    )}
                                    onValueChange={(value) => {
                                        const opt = JSON.parse(value);
                                        updateSettings({
                                            videoModel: opt.modelName,
                                            generateAudio: opt.generateAudio,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Video Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VIDEO_MODEL_OPTIONS.map((opt) => (
                                            <SelectItem
                                                key={opt.label}
                                                value={JSON.stringify(opt)}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <p
                    className={cn(
                        "whitespace-nowrap pt-2 text-xs text-muted-foreground",
                        // Use transition-none to hide instantly on collapse
                        isCollapsed
                            ? "h-0 w-0 opacity-0 transition-none"
                            : "h-auto w-full text-center opacity-100 transition-all duration-300",
                    )}
                >
                    Made with ❤️ by @mblanc
                </p>
            </div>
        </aside>
    );
}
