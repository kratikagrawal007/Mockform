import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { importShots, openEditor } from "./helpers";

/** Runs axe (WCAG 2.1 A/AA rules) and prints anything it finds. */
async function audit(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  return summary;
}

for (const theme of ["dark", "light"] as const) {
  test(`no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
    await openEditor(page);
    if (theme === "light")
      await page.getByRole("button", { name: "Switch to light theme" }).click();
    await importShots(page, ["shot.png"]);
    expect(await audit(page)).toEqual([]);

    await page.getByRole("button", { name: "Export options" }).click();
    expect(await audit(page)).toEqual([]);
    await page.keyboard.press("Escape");

    await page.keyboard.press("?");
    expect(await audit(page)).toEqual([]);
  });
}

test("the small-screen notice is accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await audit(page)).toEqual([]);
});
