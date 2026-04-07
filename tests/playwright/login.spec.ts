import { test, expect } from "@playwright/test";

test("has login page", async ({ page }) => {
  await page.goto("/");

  // Expects page to have a heading of "Notify AI Login".
  await expect(
    page.getByRole("heading", { name: "Notify AI Login", level: 1 }),
  ).toHaveText("Notify AI Login");
});
