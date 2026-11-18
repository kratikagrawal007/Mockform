import { MATCHED_GRADIENT_ID } from "@/editor/backgrounds";
import type { GradientDef } from "@/editor/scene/types";

type RGB = [number, number, number];

const hex = (c: RGB) =>
  `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Chroma (distance from grey, 0–1) and lightness. Unlike HSL saturation, chroma stays low for near-whites. */
function tone([r, g, b]: RGB) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return { chroma: max - min, l: (max + min) / 2 };
}

const dist = (a: RGB, b: RGB) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Picks up to `count` representative colours from RGBA pixel data.
 * Colours are bucketed, then ranked by how common and how vivid they are,
 * skipping ones too close to a colour already picked.
 */
export function extractPalette(data: Uint8ClampedArray, count = 3): string[] {
  const buckets = new Map<number, { n: number; sum: RGB }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    bucket.n++;
    bucket.sum[0] += r;
    bucket.sum[1] += g;
    bucket.sum[2] += b;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .map(({ n, sum }) => {
      const c: RGB = [sum[0] / n, sum[1] / n, sum[2] / n];
      const { chroma, l } = tone(c);
      // Favour vivid mid-tones; near-white and near-black UI chrome is common but dull.
      const vivid = 0.03 + chroma * (1 - Math.abs(l - 0.5) * 1.4);
      return { c, score: n * Math.max(0.01, vivid) };
    })
    .sort((a, b) => b.score - a.score);

  const picked: RGB[] = [];
  for (const { c } of ranked) {
    if (picked.every((p) => dist(p, c) > 70)) picked.push(c);
    if (picked.length === count) break;
  }
  return picked.map(hex);
}

/** Darkens a colour, for a calm base under the gradient blobs. */
function darken(color: string, amount: number) {
  const n = parseInt(color.slice(1), 16);
  const c: RGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return hex(c.map((v) => v * (1 - amount)) as RGB);
}

export function gradientFromPalette(colors: string[]): GradientDef {
  const [a = "#6d4aff", b = a, c = b] = colors;
  return {
    id: MATCHED_GRADIENT_ID,
    name: "Matched",
    base: darken(a, 0.72),
    blobs: [
      { x: 0.15, y: 0.12, r: 0.7, color: a },
      { x: 0.9, y: 0.95, r: 0.65, color: b },
      { x: 0.85, y: 0.15, r: 0.4, color: c },
    ],
  };
}

/** Samples an image small and builds a gradient from its colours. */
export function matchGradient(
  source: CanvasImageSource,
  width: number,
  height: number,
): GradientDef {
  const s = 64 / Math.max(width, height);
  const w = Math.max(1, Math.round(width * s));
  const h = Math.max(1, Math.round(height * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  return gradientFromPalette(extractPalette(ctx.getImageData(0, 0, w, h).data));
}
