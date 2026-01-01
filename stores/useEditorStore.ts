import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface EditorState {
    activeTab: string;
    currentTime: number;
    isSidebarCollapsed: boolean;
    sidebarRefreshTrigger: number;
    exportProgress: number;

    // Actions
    setActiveTab: (tab: string) => void;
    setCurrentTime: (time: number) => void;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    triggerSidebarRefresh: () => void;
    setExportProgress: (progress: number) => void;
}

export const useEditorStore = create<EditorState>()(
    devtools((set) => ({
        activeTab: "create",
        currentTime: 0,
        isSidebarCollapsed: false,
        sidebarRefreshTrigger: 0,
        exportProgress: 0,

        setActiveTab: (activeTab) => set({ activeTab }, false, "setActiveTab"),

        setCurrentTime: (currentTime) =>
            set({ currentTime }, false, "setCurrentTime"),

        setIsSidebarCollapsed: (isSidebarCollapsed) =>
            set({ isSidebarCollapsed }, false, "setIsSidebarCollapsed"),

        triggerSidebarRefresh: () =>
            set(
                (state) => ({
                    sidebarRefreshTrigger: state.sidebarRefreshTrigger + 1,
                }),
                false,
                "triggerSidebarRefresh",
            ),

        setExportProgress: (exportProgress) =>
            set({ exportProgress }, false, "setExportProgress"),
    })),
);
