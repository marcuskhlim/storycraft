import { describe, it, expect, beforeEach } from "vitest";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { Scenario } from "@/app/types";

describe("useScenarioStore", () => {
    beforeEach(() => {
        useScenarioStore.getState().reset();
    });

    it("should have initial state", () => {
        const state = useScenarioStore.getState();
        expect(state.currentScenarioId).toBeNull();
        expect(state.pitch).toBe("");
        expect(state.style).toBe("Photographic");
        expect(state.scenario).toBeUndefined();
    });

    it("should update fields using setField", () => {
        useScenarioStore.getState().setField("name", "Test Scenario");
        useScenarioStore.getState().setField("durationSeconds", 15);

        const state = useScenarioStore.getState();
        expect(state.name).toBe("Test Scenario");
        expect(state.durationSeconds).toBe(15);
    });

    it("should set scenario", () => {
        const mockScenario = { id: "123", name: "Mock" } as unknown as Scenario;
        useScenarioStore.getState().setScenario(mockScenario);

        expect(useScenarioStore.getState().scenario).toEqual(mockScenario);
    });

    it("should set error message", () => {
        useScenarioStore.getState().setErrorMessage("Error occurred");
        expect(useScenarioStore.getState().errorMessage).toBe("Error occurred");
    });

    it("should reset to initial state", () => {
        useScenarioStore.getState().setField("name", "Modified");
        useScenarioStore.getState().setErrorMessage("Some error");
        useScenarioStore.getState().reset();

        const state = useScenarioStore.getState();
        expect(state.name).toBe("");
        expect(state.errorMessage).toBeNull();
    });
});
