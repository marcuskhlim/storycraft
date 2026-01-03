"use client";

import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import { CreateTab } from "@/app/features/create/components/create-tab";
import { TabSkeleton } from "@/app/features/shared/components/tab-skeleton";
import { toast } from "sonner";
import { Scenario } from "@/app/types";

const EditorTab = dynamic(
    () =>
        import("@/app/features/editor/components/editor-tab").then(
            (mod) => mod.EditorTab,
        ),
    {
        loading: () => <TabSkeleton />,
        ssr: false,
    },
);

const ScenarioTab = dynamic(
    () =>
        import("@/app/features/scenario/components/scenario-tab").then(
            (mod) => mod.ScenarioTab,
        ),
    {
        loading: () => <TabSkeleton />,
    },
);

const StoryboardTab = dynamic(
    () =>
        import("@/app/features/storyboard/components/storyboard-tab").then(
            (mod) => mod.StoryboardTab,
        ),
    {
        loading: () => <TabSkeleton />,
    },
);

const StoriesTab = dynamic(
    () =>
        import("@/app/features/stories/components/stories-tab").then(
            (mod) => mod.StoriesTab,
        ),
    {
        loading: () => <TabSkeleton />,
    },
);

import { UserProfile } from "@/app/features/shared/components/user-profile";
import { Sidebar } from "@/app/features/shared/components/layout/sidebar";
import { TopNav } from "@/app/features/shared/components/layout/top-nav";
import { Button } from "@/components/ui/button";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useSidebarActions } from "@/app/features/shared/hooks/use-sidebar-actions";

export default function Home() {
    // Zustand Stores
    const { scenario, isScenarioLoading, setField } = useScenarioStore();

    const { activeTab, isSidebarCollapsed } = useEditorStore();

    const { handleCreateNewStory, handleSelectScenario } = useSidebarActions();

    // Scenario auto-save functionality
    const {
        saveScenarioDebounced,
        getCurrentScenarioId,
        isAuthenticated,
        loadScenario,
    } = useScenario();

    const lastSavedScenarioRef = useRef<string | null>(null);

    // Auto-save scenario whenever it changes (debounced)
    // Skip auto-save when loading a scenario from sidebar to prevent overwriting with stale data
    useEffect(() => {
        if (isScenarioLoading) {
            // Reset the flag after skipping this save
            setField("isScenarioLoading", false);
            // Sync the ref with loaded content to prevent immediate re-save
            if (scenario) {
                lastSavedScenarioRef.current = JSON.stringify(scenario);
            }
            return;
        }

        if (scenario && isAuthenticated) {
            const currentContent = JSON.stringify(scenario);
            if (currentContent !== lastSavedScenarioRef.current) {
                lastSavedScenarioRef.current = currentContent;
                saveScenarioDebounced(
                    scenario,
                    getCurrentScenarioId() || undefined,
                );
            }
        }
    }, [
        scenario,
        isAuthenticated,
        saveScenarioDebounced,
        getCurrentScenarioId,
        isScenarioLoading,
        setField,
    ]);

    const handleStorySelect = async (
        selectedScenario: Scenario,
        scenarioId?: string,
    ) => {
        if (!scenarioId) return;

        try {
            // Fetch fresh data from Firestore
            const freshScenario = await loadScenario(scenarioId);

            if (freshScenario) {
                handleSelectScenario(freshScenario, scenarioId);
            } else {
                handleSelectScenario(selectedScenario, scenarioId);
            }
        } catch (error) {
            toast.error("Failed to load scenario details");
            console.error("Error loading fresh scenario:", error);
            handleSelectScenario(selectedScenario, scenarioId);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background font-sans">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main
                className={`flex flex-1 flex-col transition-all duration-300 ${isSidebarCollapsed ? "ml-[70px]" : "ml-[280px]"}`}
            >
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-card/50 px-6 backdrop-blur-sm">
                    <div className="flex w-1/3 items-center gap-4">
                        <div className="flex items-center gap-2 text-xl font-bold text-primary">
                            <Image
                                src="/logo6.png"
                                alt="StoryCraft Logo"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            StoryCraft
                        </div>
                    </div>

                    <div className="flex w-1/3 flex-1 justify-center">
                        <TopNav />
                    </div>

                    <div className="flex w-1/3 items-center justify-end gap-4">
                        <UserProfile isCollapsed={false} />
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
                    <div className="mx-auto max-w-7xl space-y-6">
                        {activeTab === "create" && <CreateTab />}

                        {activeTab === "scenario" && <ScenarioTab />}

                        {activeTab === "storyboard" && scenario && (
                            <StoryboardTab />
                        )}

                        {activeTab === "editor" && scenario && <EditorTab />}

                        {activeTab === "stories" && (
                            <StoriesTab
                                onSelectScenario={handleStorySelect}
                                onCreateNewStory={handleCreateNewStory}
                            />
                        )}

                        {!scenario &&
                            activeTab !== "create" &&
                            activeTab !== "stories" && (
                                <div className="flex h-[50vh] flex-col items-center justify-center text-muted-foreground">
                                    <BookOpen className="mb-4 h-12 w-12 opacity-50" />
                                    <p className="text-lg font-medium">
                                        Select a story from the sidebar or
                                        create a new one.
                                    </p>
                                    <Button
                                        onClick={handleCreateNewStory}
                                        variant="link"
                                        className="mt-2"
                                    >
                                        Create New Story
                                    </Button>
                                </div>
                            )}
                    </div>
                </div>
            </main>
        </div>
    );
}
