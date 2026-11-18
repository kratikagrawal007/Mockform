import { expect, test } from "@playwright/test";

test.describe("editor shell", () => {
  test("opens in dark mode on a first visit, even when the OS prefers light", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await context.close();
  });

  test("remembers the chosen theme across reloads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("canvas presets resize the canvas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const size = page.getByTestId("canvas-size");
    await expect(size).toHaveText("1080 × 1350");

    await page.getByRole("radio", { name: "16:9" }).click();
    await expect(size).toHaveText("1920 × 1080");
    // The canvas animates to its new size, so wait for it to settle.
    await expect
      .poll(async () => {
        const box = await page.getByTestId("canvas").boundingBox();
        return Math.round((box!.width / box!.height) * 100) / 100;
      })
      .toBeCloseTo(16 / 9, 1);

    await page.getByRole("radio", { name: "W×H" }).click();
    const width = page.getByLabel("W", { exact: true });
    await width.fill("2000");
    await width.press("Enter");
    await expect(size).toHaveText("2000 × 1200");
  });

  test("small screens get a notice instead of the editor", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("small-screen-notice")).toBeVisible();
    await expect(page.getByTestId("editor")).toBeHidden();
  });
});
