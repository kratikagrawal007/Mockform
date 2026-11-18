/* Small colour and shading helpers that give flat shapes a physical look. */

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type RGB = [number, number, number];

export function parseHex(color: string): RGB | null {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: RGB) =>
  `#${c
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour; other colour strings pass through. */
export function shade(color: string, amount: number): string {
  const c = parseHex(color);
  if (!c) return color;
  return toHex(
    c.map((v) =>
      amount >= 0 ? v + (255 - v) * amount : v * (1 + amount),
    ) as RGB,
  );
}

/** Perceived brightness, 0–1. */
export function luminance(color: string): number {
  const c = parseHex(color);
  if (!c) return 0.5;
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}

export function rgba(color: string, alpha: number): string {
  const c = parseHex(color);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${alpha})` : color;
}

/**
 * Casts only the shadow of a shape (the shape itself is never painted), so it
 * works under translucent devices too. The shape is drawn far away and the
 * shadow offset brings the shadow back, compensating for the current transform.
 */
export function castShadow(
  ctx: Ctx,
  draw: () => void,
  shadow: { blur: number; offsetY: number; color: string },
) {
  const FAR = 100_000;
  const m = ctx.getTransform();
  const det = m.a * m.d - m.b * m.c;
  if (!det) return;
  // Local vector that maps to (-FAR, 0) in device pixels.
  const vx = (m.d * -FAR) / det;
  const vy = (m.b * FAR) / det;
  ctx.save();
  ctx.translate(vx, vy);
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = FAR;
  ctx.shadowOffsetY = shadow.offsetY;
  draw();
  ctx.restore();
}
