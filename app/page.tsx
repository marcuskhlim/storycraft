"use client";

import { useScenario } from "@/app/features/scenario/hooks/use-scenario";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

import { CreateTab } from "@/app/features/create/components/create-tab";
import { EditorTab } from "@/app/features/editor/components/editor-tab";
import { ScenarioTab } from "@/app/features/scenario/components/scenario-tab";
import { StoryboardTab } from "@/app/features/storyboard/components/storyboard-tab";
import { UserProfile } from "@/app/features/shared/components/user-profile";
import { Sidebar } from "@/app/features/shared/components/layout/sidebar";
import { TopNav } from "@/app/features/shared/components/layout/top-nav";
import { Button } from "@/components/ui/button";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { useSidebarActions } from "@/app/features/shared/hooks/use-sidebar-actions";

export default function Home() {
    // Zustand Stores
    const { scenario } = useScenarioStore();

    const { activeTab, isSidebarCollapsed, triggerSidebarRefresh } =
        useEditorStore();

    const { isLoadingScenarioRef, handleCreateNewStory } = useSidebarActions();

    // Scenario auto-save functionality
    const { saveScenarioDebounced, getCurrentScenarioId, isAuthenticated } =
        useScenario();

    // Auto-save scenario whenever it changes (debounced)
    // Skip auto-save when loading a scenario from sidebar to prevent overwriting with stale data
    useEffect(() => {
        if (isLoadingScenarioRef.current) {
            // Reset the flag after skipping this save
            isLoadingScenarioRef.current = false;
            return;
        }
        if (scenario && isAuthenticated) {
            saveScenarioDebounced(
                scenario,
                getCurrentScenarioId() || undefined,
            );
            // Trigger sidebar refresh after save (with a small delay to allow debounced save to complete)
            setTimeout(() => {
                triggerSidebarRefresh();
            }, 1500); // Wait longer than the 1s debounce
        }
    }, [
        scenario,
        isAuthenticated,
        saveScenarioDebounced,
        getCurrentScenarioId,
        triggerSidebarRefresh,
        isLoadingScenarioRef,
    ]);

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

                        {!scenario && activeTab !== "create" && (
                            <div className="flex h-[50vh] flex-col items-center justify-center text-muted-foreground">
                                <BookOpen className="mb-4 h-12 w-12 opacity-50" />
                                <p className="text-lg font-medium">
                                    Select a story from the sidebar or create a
                                    new one.
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
