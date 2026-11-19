// Generates Mockform's own icons, link-preview image and Product Hunt gallery
// images by driving Mockform itself in a headless browser.
//
//   npm run build && npm start      # serves the static build on :3100
//   npm run assets                  # in another terminal
//
// Writes public/icon-192.png, public/icon-512.png, public/maskable-512.png, public/apple-icon.png,
// public/og.png and marketing/product-hunt-{1,2,3}.png.

import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";

const browser = await chromium.launch();
await mkdir("marketing", { recursive: true });

/* ---------- Icons from the brand kit's light app icon ----------
   Rounded tiles for browsers and PWAs; full-bleed squares (no corner radius)
   where the platform applies its own mask (iOS home screen, Android maskable).
   The symbol sits inside the 80% safe zone, so masking never clips it. */
const appIcon = await readFile(
  "public/brand/mockform-app-icon-light.svg",
  "utf8",
);
const fullBleed = appIcon.replace('rx="56"', 'rx="0"');
const iconPage = await browser.newPage();
for (const [file, size, svg] of [
  ["public/icon-512.png", 512, appIcon],
  ["public/icon-192.png", 192, appIcon],
  ["public/maskable-512.png", 512, fullBleed],
  ["public/apple-icon.png", 180, fullBleed],
]) {
  await iconPage.setViewportSize({ width: size, height: size });
  await iconPage.setContent(
    `<body style="margin:0;background:transparent">${svg.replace(/width="256" height="256"/, `width="${size}" height="${size}" style="display:block"`)}</body>`,
  );
  await iconPage.screenshot({ path: file, omitBackground: true });
}
await iconPage.close();

/* ---------- Helpers ---------- */

/** Draws a made-up app screen (no real products), returned as PNG bytes. */
async function appScreen(page, accent, title) {
  const b64 = await page.evaluate(
    ([accent, title]) => {
      const c = document.createElement("canvas");
      c.width = 1206;
      c.height = 2622;
      const x = c.getContext("2d");
      x.fillStyle = "#fbfaf8";
      x.fillRect(0, 0, 1206, 2622);
      x.fillStyle = "#16151a";
      x.font = "600 54px system-ui";
      x.fillText("Today", 72, 250);
      x.font = "bold 104px system-ui";
      x.fillText(title, 72, 380);
      x.fillStyle = accent;
      x.beginPath();
      x.roundRect(72, 460, 1062, 620, 72);
      x.fill();
      x.fillStyle = "rgba(255,255,255,0.9)";
      x.font = "600 56px system-ui";
      x.fillText("This week", 140, 580);
      const bars = [0.45, 0.7, 0.55, 0.9, 0.62, 0.8, 0.5];
      bars.forEach((h, i) => {
        x.fillStyle = "rgba(255,255,255,0.85)";
        x.beginPath();
        x.roundRect(140 + i * 132, 1020 - h * 360, 84, h * 360, 24);
        x.fill();
      });
      const rows = [
        "Morning run",
        "Deep work",
        "Read 20 pages",
        "Plan tomorrow",
      ];
      rows.forEach((r, i) => {
        const y = 1180 + i * 250;
        x.fillStyle = "#ffffff";
        x.beginPath();
        x.roundRect(72, y, 1062, 200, 48);
        x.fill();
        x.fillStyle = i < 2 ? accent : "#e6e2f0";
        x.beginPath();
        x.arc(170, y + 100, 44, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#16151a";
        x.font = "600 56px system-ui";
        x.fillText(r, 250, y + 120);
      });
      return c.toDataURL("image/png").split(",")[1];
    },
    [accent, title],
  );
  return Buffer.from(b64, "base64");
}

async function freshEditor(width = 1440, height = 900) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    acceptDownloads: true,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForSelector('[data-ready="true"]');
  return { ctx, page };
}

const radio = (page, name) => page.getByRole("radio", { name, exact: true });

async function setShots(page, files) {
  await page.getByTestId("file-input").setInputFiles(files);
  await page.waitForTimeout(400);
}

async function exportPng(page, path) {
  await page.getByRole("button", { name: "Export options" }).click();
  const menu = page.getByRole("dialog", { name: "Export options" });
  await menu.getByRole("radio", { name: "PNG" }).click();
  await menu.getByRole("radio", { name: "1×" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("button", { name: "Download PNG" }).click(),
  ]);
  await dl.saveAs(path);
}

async function pickPreset(page, name) {
  await page.getByRole("radio", { name: /^Social/ }).click();
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

/* ---------- 1. A screenshot of Mockform itself, mid-edit ---------- */
const editorShot = await (async () => {
  const { ctx, page } = await freshEditor();
  await page.getByRole("radio", { name: /^Showcase/ }).click();
  await page.getByRole("button", { name: /Launch day/ }).click();
  await setShots(page, [
    {
      name: "habits.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#6d4aff", "Habits"),
    },
    {
      name: "focus.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#ff7a59", "Focus"),
    },
    {
      name: "sleep.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#2fb8c9", "Sleep"),
    },
  ]);
  const buf = await page.screenshot();
  await ctx.close();
  return buf;
})();

/* ---------- 2. Link preview: Mockform in a browser window ---------- */
async function browserHero(preset, path) {
  const { ctx, page } = await freshEditor();
  await pickPreset(page, preset);
  await page
    .getByRole("button", { name: "Browser window", exact: true })
    .click();
  await radio(page, "Dark").click();
  await setShots(page, [
    { name: "mockform.png", mimeType: "image/png", buffer: editorShot },
  ]);
  await radio(page, "Gradient").click();
  await radio(page, "Violet Dusk").click();
  await radio(page, "Strong").click();
  await exportPng(page, path);
  await ctx.close();
}
await browserHero("Link preview", "public/og.png");
await browserHero("Product Hunt gallery", "marketing/product-hunt-1.png");

/* ---------- 3. Three phones fanned out ---------- */
{
  const { ctx, page } = await freshEditor();
  await page.getByRole("radio", { name: /^Showcase/ }).click();
  await page.getByRole("button", { name: /Launch day/ }).click();
  await pickPreset(page, "Product Hunt gallery");
  await setShots(page, [
    {
      name: "a.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#6d4aff", "Habits"),
    },
    {
      name: "b.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#ff7a59", "Focus"),
    },
    {
      name: "c.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#2fb8c9", "Sleep"),
    },
  ]);
  await exportPng(page, "marketing/product-hunt-2.png");
  await ctx.close();
}

/* ---------- 4. Laptop + phone, angled ---------- */
{
  const { ctx, page } = await freshEditor();
  await page
    .getByRole("radio", { name: "Laptop + Phone", exact: true })
    .click();
  await pickPreset(page, "Product Hunt gallery");
  await setShots(page, [
    { name: "mockform.png", mimeType: "image/png", buffer: editorShot },
    {
      name: "app.png",
      mimeType: "image/png",
      buffer: await appScreen(page, "#2fd6a3", "Habits"),
    },
  ]);
  const angle = page.getByRole("radiogroup", { name: "Angle" });
  await page
    .getByRole("radiogroup", { name: "Device to edit" })
    .getByRole("radio")
    .nth(1)
    .click();
  await angle.getByRole("radio", { name: "Turn left" }).click();
  await radio(page, "Gradient").click();
  await radio(page, "Aurora").click();
  await exportPng(page, "marketing/product-hunt-3.png");
  await ctx.close();
}

await writeFile(
  "marketing/README.md",
  "Launch images generated with `npm run assets` (see scripts/make-launch-assets.mjs).\n",
);
await browser.close();
console.log("Launch assets written.");
