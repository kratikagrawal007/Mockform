export type CanvasPresetId =
  "auto" | "square" | "portrait" | "wide" | "story" | "custom";

export interface CanvasPreset {
  id: CanvasPresetId;
  name: string;
  short: string;
  width: number;
  height: number;
}

export const CANVAS_MIN = 64;
export const CANVAS_MAX = 16384;

export const CANVAS_PRESETS: readonly CanvasPreset[] = [
  // "Original" follows the screenshot once one is added; until then it uses 4:5.
  { id: "auto", name: "Original", short: "Auto", width: 1080, height: 1350 },
  { id: "square", name: "Square", short: "1:1", width: 1080, height: 1080 },
  { id: "portrait", name: "Portrait", short: "4:5", width: 1080, height: 1350 },
  { id: "wide", name: "Wide", short: "16:9", width: 1920, height: 1080 },
  { id: "story", name: "Story", short: "9:16", width: 1080, height: 1920 },
  { id: "custom", name: "Custom", short: "W×H", width: 1600, height: 1200 },
];

export function getPreset(id: CanvasPresetId): CanvasPreset {
  return CANVAS_PRESETS.find((p) => p.id === id) ?? CANVAS_PRESETS[2];
}

/** Clamps a user-typed canvas dimension to a whole number in the allowed range. */
export function clampDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(value)));
}

/** Largest size with the canvas aspect ratio that fits inside the available box. */
export function fitInside(
  canvas: { width: number; height: number },
  box: { width: number; height: number },
): { width: number; height: number } {
  if (box.width <= 0 || box.height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(box.width / canvas.width, box.height / canvas.height);
  return {
    width: Math.floor(canvas.width * scale),
    height: Math.floor(canvas.height * scale),
  };
}
