import type { Size } from "@/editor/scene/types";

export const EXPORT_MAX_SIDE = 16384;
export const EXPORT_MAX_PIXELS = 100_000_000;

export type ExportSize =
  { ok: true; width: number; height: number } | { ok: false; message: string };

/** Output size for a canvas at a given scale, or why it's too big for browsers to handle. */
export function exportSize(canvas: Size, scale: number): ExportSize {
  const width = Math.round(canvas.width * scale);
  const height = Math.round(canvas.height * scale);
  if (width > EXPORT_MAX_SIDE || height > EXPORT_MAX_SIDE) {
    return {
      ok: false,
      message: `Too large: each side must be ${EXPORT_MAX_SIDE.toLocaleString("en")} px or less.`,
    };
  }
  if (width * height > EXPORT_MAX_PIXELS) {
    return {
      ok: false,
      message: "Too large: the image must be 100 megapixels or less.",
    };
  }
  return { ok: true, width, height };
}

export function exportFileName(size: Size, format: "png" | "jpeg"): string {
  return `mockform-${size.width}x${size.height}.${format === "png" ? "png" : "jpg"}`;
}
