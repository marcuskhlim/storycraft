import { describe, it, expect } from "vitest";
import { getRAIUserMessage } from "@/lib/utils/rai";

describe("getRAIUserMessage", () => {
    it("should return the correct message for celebrity likeness", () => {
        const result = getRAIUserMessage("RAI blocked reason: 29310472");
        expect(result).toContain("photorealistic celebrity likeness");
    });

    it("should return the correct message for sexually explicit content", () => {
        const result = getRAIUserMessage("Error code 90789179 detected");
        expect(result).toContain("sexually explicit or adult content");
    });

    it("should return the original string if no code matches", () => {
        const result = getRAIUserMessage("Some unknown reason");
        expect(result).toBe("Some unknown reason");
    });
});
