import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { importShots, openEditor } from "./helpers";

/** Records a short WebM in the browser (a moving bar on a coloured screen). */
async function makeWebm(page: Page, seconds = 1.5) {
  const b64 = await page.evaluate(async (ms) => {
    const c = document.createElement("canvas");
    c.width = 360;
    c.height = 780;
    const ctx = c.getContext("2d")!;
    const rec = new MediaRecorder(c.captureStream(30), {
      mimeType: "video/webm",
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(100);
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = performance.now() - t0;
        ctx.fillStyle = "#6d4aff";
        ctx.fillRect(0, 0, 360, 780);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(((t / ms) * 300) % 300, 300, 60, 60);
        if (t < ms) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    rec.stop();
    await done;
    const buf = new Uint8Array(
      await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
    );
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000)
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, seconds * 1000);
  return Buffer.from(b64, "base64");
}

test.beforeEach(async ({ page }) => openEditor(page));

test("perspective angles apply per device and still export", async ({
  page,
}) => {
  await importShots(page, ["shot.png"]);
  const angle = page.getByRole("radiogroup", { name: "Angle" });
  await angle.getByRole("radio", { name: "Turn left" }).click();
  await expect(angle.getByRole("radio", { name: "Turn left" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // The tilted device leaves the canvas centre-left and centre-right unevenly filled; just check export works.
  await page.getByRole("button", { name: "Export options" }).click();
  await page.getByRole("radio", { name: "1×" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PNG" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("mockform-1080x1350.png");

  await page.getByRole("radio", { name: "Duo", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Device to edit" })
    .getByRole("radio")
    .nth(1)
    .click();
  await expect(angle.getByRole("radio", { name: "Flat" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("a screen recording plays, trims and exports as video", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.getByTestId("file-input").setInputFiles({
    name: "clip.webm",
    mimeType: "video/webm",
    buffer: await makeWebm(page),
  });

  const panel = page.getByRole("complementary", { name: "Scene settings" });
  await expect(panel.getByText("clip.webm")).toBeVisible();
  await expect(page.getByTestId("video-length")).toContainText("Plays 0:01");
  // New videos start playing.
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();

  await page.getByRole("slider", { name: "Trim end" }).fill("1");
  await expect(page.getByTestId("video-length")).toContainText("Plays 0:01.0");

  await page.getByRole("button", { name: "Export options" }).click();
  const menu = page.getByRole("dialog", { name: "Export options" });
  await menu.getByRole("radio", { name: "Video" }).click();
  await menu.getByRole("radio", { name: "480p" }).click();
  await expect(page.getByTestId("export-size")).toHaveText(
    "480 × 600 px · 0:01.0 · 30 fps",
  );

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Export video" }).click(),
  ]);
  const name = download.suggestedFilename();
  expect(name).toMatch(/^mockform-480x600\.(mp4|webm)$/);
  const file = await readFile((await download.path())!);
  expect(file.length).toBeGreaterThan(1000);
  if (name.endsWith(".mp4"))
    expect(file.subarray(4, 8).toString("ascii")).toBe("ftyp");
  else expect(file.subarray(0, 4).toString("hex")).toBe("1a45dfa3");
});

test("a video can be the background", async ({ page }) => {
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.getByTestId("background-input").setInputFiles({
    name: "loop.webm",
    mimeType: "video/webm",
    buffer: await makeWebm(page, 1),
  });
  await expect(
    page.getByRole("button", { name: "Replace background video" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});
