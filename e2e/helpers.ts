import { expect, type Page } from "@playwright/test";

/** Makes a PNG in the browser so the tests need no fixture files. */
export async function makePng(
  page: Page,
  width: number,
  height: number,
  color = "#3a7bff",
  hole = false,
) {
  const b64 = await page.evaluate(
    ([w, h, c, cut]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, w, h);
      if (cut) {
        // A frame: opaque border with a transparent screen in the middle.
        ctx.clearRect(w * 0.1, h * 0.08, w * 0.8, h * 0.84);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(w * 0.1, h * 0.05, w * 0.8, h * 0.08);
      }
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height, color, hole] as const,
  );
  return Buffer.from(b64, "base64");
}

export async function importShots(
  page: Page,
  names: string[],
  w = 1206,
  h = 2622,
) {
  const colors = ["#3a7bff", "#ff7a59", "#2fd6a3"];
  await page.getByTestId("file-input").setInputFiles(
    await Promise.all(
      names.map(async (name, i) => ({
        name,
        mimeType: "image/png",
        buffer: await makePng(page, w, h, colors[i % 3]),
      })),
    ),
  );
}

export async function openEditor(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("editor")).toHaveAttribute(
    "data-ready",
    "true",
  );
}

export const sliderValue = (page: Page, label: string) =>
  page.getByRole("slider", { name: label, exact: true });
