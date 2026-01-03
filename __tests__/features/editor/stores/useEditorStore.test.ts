import { describe, it, expect } from "vitest";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";

describe("useEditorStore", () => {
    it("should have initial state", () => {
        const state = useEditorStore.getState();
        expect(state.activeTab).toBe("create");
        expect(state.currentTime).toBe(0);
        expect(state.isSidebarCollapsed).toBe(false);
    });

    it("should update activeTab", () => {
        useEditorStore.getState().setActiveTab("scenario");
        expect(useEditorStore.getState().activeTab).toBe("scenario");
    });

    it("should update currentTime", () => {
        useEditorStore.getState().setCurrentTime(10.5);
        expect(useEditorStore.getState().currentTime).toBe(10.5);
    });

    it("should update isSidebarCollapsed", () => {
        useEditorStore.getState().setIsSidebarCollapsed(true);
        expect(useEditorStore.getState().isSidebarCollapsed).toBe(true);
    });

    it("should update exportProgress", () => {
        useEditorStore.getState().setExportProgress(45);
        expect(useEditorStore.getState().exportProgress).toBe(45);
    });
});
