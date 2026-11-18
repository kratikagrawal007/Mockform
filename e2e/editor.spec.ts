import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

/** Makes a PNG in the browser so the tests need no fixture files. */
async function makePng(page: Page, width: number, height: number) {
  const b64 = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#3a7bff";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(w * 0.1, h * 0.05, w * 0.8, h * 0.08);
      return c.toDataURL("image/png").split(",")[1];
    },
    [width, height] as const,
  );
  return Buffer.from(b64, "base64");
}

async function importShot(
  page: Page,
  name = "home-screen.png",
  w = 1206,
  h = 2622,
) {
  await page.getByTestId("file-input").setInputFiles({
    name,
    mimeType: "image/png",
    buffer: await makePng(page, w, h),
  });
}

/** Width and height from a PNG's header. */
function pngSize(buf: Buffer) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("editor")).toHaveAttribute(
    "data-ready",
    "true",
  );
});

test("imports a screenshot and advances the guide", async ({ page }) => {
  await expect(page.getByTestId("drop-prompt")).toBeVisible();
  await importShot(page);

  const panel = page.getByRole("complementary", { name: "Scene settings" });
  await expect(panel.getByText("home-screen.png")).toBeVisible();
  await expect(panel.getByText("1206 × 2622")).toBeVisible();
  await expect(page.getByTestId("drop-prompt")).toBeHidden();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Pick a device",
  );
});

test("rejects unsupported files with a message", async ({ page }) => {
  await page.getByTestId("file-input").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "PNG, JPG and WebP" }),
  ).toBeVisible();
});

test("switches device from the grid and the select stays in sync", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Laptop 14″" }).click();
  await expect(
    page.getByRole("button", { name: "Laptop 14″" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox")).toHaveValue("laptop-14");
  await expect(page.getByRole("radio", { name: "Silver" })).toBeVisible();
});

test("undo and redo restore the scene", async ({ page }) => {
  await importShot(page);
  await expect(page.getByTestId("drop-prompt")).toBeHidden();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("drop-prompt")).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("drop-prompt")).toBeHidden();
});

test("exports a PNG at the chosen scale", async ({ page }) => {
  await importShot(page);
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "3×" }).click();
  await expect(page.getByTestId("export-size")).toHaveText("3240 × 4050 px");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PNG" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("mockform-3240x4050.png");
  const file = await readFile((await download.path())!);
  expect(pngSize(file)).toEqual({ width: 3240, height: 4050 });
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
});

test("exports a JPG with the main button after switching format", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "JPG" }).click();
  await page.keyboard.press("Escape");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("mockform-2160x2700.jpg");
  const file = await readFile((await download.path())!);
  expect(file.subarray(0, 2).toString("hex")).toBe("ffd8"); // JPEG signature
});

test("Original canvas follows the screenshot's resolution", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Auto" }).click();
  await importShot(page, "tall.png", 1206, 2622);
  // Phone Pro: native screen width plus frame, at 80% fill.
  await expect(page.getByTestId("canvas-size")).toHaveText(
    /^(16\d\d) × (33\d\d)$/,
  );
});
