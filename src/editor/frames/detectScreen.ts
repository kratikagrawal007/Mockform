import type { Rect } from "@/editor/scene/types";

export type DetectResult =
  | { ok: true; screen: Rect & { radius: number } }
  | { ok: false; message: string };

const TRANSPARENT = 20;

/**
 * Finds the screen in a frame image: the transparent area connected to the
 * centre, which must be enclosed by the frame (not touching the image edge).
 * `alpha` is one byte per pixel, row by row.
 */
export function detectScreen(
  alpha: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): DetectResult {
  const start = Math.floor(height / 2) * width + Math.floor(width / 2);
  if (alpha[start] >= TRANSPARENT) {
    return {
      ok: false,
      message:
        "The middle of that frame isn't transparent. Cut out the screen area and try again.",
    };
  }

  const seen = new Uint8Array(width * height);
  const stack = [start];
  seen[start] = 1;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      return {
        ok: false,
        message: "The screen area must be fully enclosed by the frame.",
      };
    }
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    for (const n of [i - 1, i + 1, i - width, i + width]) {
      if (!seen[n] && alpha[n] < TRANSPARENT) {
        seen[n] = 1;
        stack.push(n);
      }
    }
  }

  const screen = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
  if (screen.width < width * 0.2 || screen.height < height * 0.2) {
    return {
      ok: false,
      message: "The transparent screen area is too small to use.",
    };
  }

  // Corner radius: walk diagonally in from the bounding box corner until we reach the screen.
  let steps = 0;
  const maxSteps = Math.min(screen.width, screen.height) / 2;
  while (steps < maxSteps && !seen[(minY + steps) * width + (minX + steps)])
    steps++;
  const radius = Math.round((steps * Math.SQRT2) / (Math.SQRT2 - 1));

  return { ok: true, screen: { ...screen, radius } };
}
