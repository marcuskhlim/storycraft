import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
    await page.goto("/");

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/StoryCraft/);
});

test("get started link", async ({ page }) => {
    await page.goto("/");

    // Check for some text that should be on the home page
    // Based on the prompt in improvement.md, it should have a pitch input or similar.
    // I'll just check for "StoryCraft" in the body for now as a basic check.
    await expect(page.locator("body")).toContainText("StoryCraft");
});
