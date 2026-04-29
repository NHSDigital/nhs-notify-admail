import { expect, test } from "@playwright/test";

test("has login page", async ({ page }) => {
  await page.goto("/");

  // Expects page to have a heading of "Notify Admail Login".
  await expect(
    page.getByRole("heading", { name: "Notify Admail Login", level: 1 }),
  ).toHaveText("Notify Admail Login");
});
