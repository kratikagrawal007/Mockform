import { expect, test } from "@playwright/test";
import { importShots, makePng, openEditor, sliderValue } from "./helpers";

test.beforeEach(async ({ page }) => openEditor(page));

test("layouts add devices and several screenshots fill them in order", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Fan", exact: true }).click();
  await expect(page.getByTestId("drop-prompt")).toHaveCount(3);
  await expect(
    page.getByRole("radiogroup", { name: "Device to edit" }).getByRole("radio"),
  ).toHaveCount(3);

  await importShots(page, ["a.png", "b.png", "c.png"]);
  await expect(page.getByTestId("drop-prompt")).toHaveCount(0);
  // Several files fill from Device 1, whichever device is selected.
  const tabs = page.getByRole("radiogroup", { name: "Device to edit" });
  for (const [i, name] of ["a.png", "b.png", "c.png"].entries()) {
    await tabs.getByRole("radio").nth(i).click();
    await expect(
      page
        .getByRole("complementary", { name: "Scene settings" })
        .getByText(name),
    ).toBeVisible();
  }

  await page.getByRole("radio", { name: "Solo", exact: true }).click();
  await expect(
    page.getByRole("radiogroup", { name: "Device to edit" }),
  ).toHaveCount(0);
});

test("dragging a device moves it, snaps back to centre, and undoes in one step", async ({
  page,
}) => {
  const overlay = page.getByTestId("stage-overlay");
  const box = (await overlay.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(cx + i * 8, cy + i * 4);
  await page.mouse.up();

  const horizontal = sliderValue(page, "Horizontal");
  await expect(horizontal).not.toHaveAttribute("aria-valuetext", "0px");

  // Back near the centre: snapping lands exactly on it.
  await page.mouse.move(cx + 80, cy + 40);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy + 20);
  await page.mouse.move(cx + 2, cy + 1);
  await page.mouse.up();
  await expect(horizontal).toHaveAttribute("aria-valuetext", "0px");

  await page.keyboard.press("ControlOrMeta+z");
  await expect(horizontal).not.toHaveAttribute("aria-valuetext", "0px");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(horizontal).toHaveAttribute("aria-valuetext", "0px");
});

test("arrow keys nudge the selected device", async ({ page }) => {
  await page.getByTestId("stage-overlay").click();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(sliderValue(page, "Horizontal")).toHaveAttribute(
    "aria-valuetext",
    "11px",
  );
});

test("the rotate handle turns the device", async ({ page }) => {
  const handle = page.getByTestId("rotate-handle");
  const h = (await handle.boundingBox())!;
  const overlay = (await page.getByTestId("stage-overlay").boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  // Swing to the right of the centre: about +90°.
  await page.mouse.move(
    overlay.x + overlay.width * 0.9,
    overlay.y + overlay.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  const value = await sliderValue(page, "Rotation").getAttribute(
    "aria-valuetext",
  );
  expect(Number.parseInt(value!)).toBeGreaterThan(45);
});

test("double-click crops; zoom and Esc work", async ({ page }) => {
  await importShots(page, ["shot.png"]);
  await page.getByTestId("stage-overlay").dblclick();
  await expect(page.getByText("Drag to reposition")).toBeVisible();
  await page.getByRole("slider", { name: "Zoom" }).fill("2");
  await expect(sliderValue(page, "Zoom")).toHaveAttribute(
    "aria-valuetext",
    "200%",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByText("Drag to reposition")).toBeHidden();
});

test("Match colors builds a gradient from the screenshot", async ({ page }) => {
  await importShots(page, ["shot.png"]);
  await page.getByRole("button", { name: "Match colors" }).click();
  await expect(page.getByRole("radio", { name: "Matched" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("the session survives a reload", async ({ page }) => {
  await importShots(page, ["keep-me.png"]);
  await page.getByRole("button", { name: "Tablet 11″", exact: true }).click();
  await page.getByRole("radio", { name: "Solid" }).click();
  // Autosave is debounced.
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByTestId("editor")).toHaveAttribute(
    "data-ready",
    "true",
  );

  await expect(page.getByRole("combobox")).toHaveValue("tablet-11");
  await expect(page.getByText("keep-me.png")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Solid" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("keyboard shortcuts and About open as dialogs", async ({ page }) => {
  await page.keyboard.press("?");
  const shortcuts = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(shortcuts).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(shortcuts).toBeHidden();

  await page.getByRole("button", { name: "About Mockform" }).click();
  await expect(
    page.getByRole("dialog", { name: "About Mockform" }),
  ).toContainText("Kratik Agrawal");
});

test("a custom frame is detected and added to Your frames", async ({
  page,
}) => {
  await page.getByTestId("frame-input").setInputFiles({
    name: "my-phone.png",
    mimeType: "image/png",
    buffer: await makePng(page, 500, 1000, "#222222", true),
  });
  await expect(
    page.getByRole("button", { name: "my-phone", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox")).toHaveValue(/^frame-/);
});

test("social and showcase presets", async ({ page }) => {
  await page.getByRole("button", { name: /Instagram story/ }).click();
  await expect(page.getByTestId("canvas-size")).toHaveText("1080 × 1920");
  await expect(
    page.getByTestId("canvas").locator("..").getByText("Instagram story"),
  ).toBeVisible();

  await page.getByRole("radio", { name: /Showcase/ }).click();
  await page.getByRole("button", { name: /Launch day/ }).click();
  await expect(page.getByTestId("canvas-size")).toHaveText("1600 × 1200");
  await expect(
    page.getByRole("radio", { name: "Fan", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});

test("dragging a file over a device highlights it as the drop target", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Fan", exact: true }).click();
  const box = (await page.getByTestId("canvas").boundingBox())!;
  const point = [box.x + box.width / 2, box.y + box.height * 0.48] as const;
  const drag = (type: string) =>
    page.evaluate(
      ([type, x, y]) => {
        const dt = new DataTransfer();
        dt.items.add(new File(["x"], "shot.png", { type: "image/png" }));
        const target = document.elementFromPoint(x as number, y as number)!;
        target.dispatchEvent(
          new DragEvent(type as string, {
            bubbles: true,
            cancelable: true,
            clientX: x as number,
            clientY: y as number,
            dataTransfer: dt,
          }),
        );
      },
      [type, ...point] as const,
    );

  await drag("dragenter");
  await drag("dragover");
  const prompts = page.getByTestId("drop-prompt");
  await expect(
    prompts.and(page.locator('[data-state="drop-target"]')),
  ).toHaveCount(1);
  await expect(
    page.getByText("Release to add it to this device"),
  ).toBeVisible();

  await drag("dragleave");
  await expect(page.locator('[data-state="drop-target"]')).toHaveCount(0);
  await expect(page.getByText("Release to add it to this device")).toBeHidden();
});

test("the empty-screen guide explains what to add and how", async ({
  page,
}) => {
  const prompt = page.getByTestId("drop-prompt");
  await expect(prompt).toContainText("Drop a screenshot or video");
  await expect(prompt).toContainText("1206 × 2622 px");
  await expect(prompt).toContainText(/or paste with (⌘V|Ctrl\+V)/);
  await expect(
    prompt.getByRole("button", { name: "Choose file" }),
  ).toBeVisible();
});
