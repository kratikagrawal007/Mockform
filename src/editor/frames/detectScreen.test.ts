import { describe, expect, it } from "vitest";
import { detectScreen } from "./detectScreen";

/** A width×height opaque frame with a transparent rectangle (optionally with rounded corners). */
function frame(
  width: number,
  height: number,
  hole: { x: number; y: number; w: number; h: number; r?: number },
) {
  const a = new Uint8Array(width * height).fill(255);
  const r = hole.r ?? 0;
  for (let y = hole.y; y < hole.y + hole.h; y++) {
    for (let x = hole.x; x < hole.x + hole.w; x++) {
      const cx = Math.min(Math.max(x, hole.x + r), hole.x + hole.w - 1 - r);
      const cy = Math.min(Math.max(y, hole.y + r), hole.y + hole.h - 1 - r);
      if (Math.hypot(x - cx, y - cy) <= r) a[y * width + x] = 0;
    }
  }
  return a;
}

describe("detectScreen", () => {
  it("finds a rectangular screen", () => {
    const r = detectScreen(
      frame(100, 200, { x: 10, y: 20, w: 80, h: 160 }),
      100,
      200,
    );
    expect(r).toEqual({
      ok: true,
      screen: { x: 10, y: 20, width: 80, height: 160, radius: 0 },
    });
  });

  it("estimates the corner radius", () => {
    const r = detectScreen(
      frame(200, 300, { x: 20, y: 20, w: 160, h: 260, r: 30 }),
      200,
      300,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.screen.radius).toBeGreaterThan(22);
    if (r.ok) expect(r.screen.radius).toBeLessThan(40);
  });

  it("explains when the middle is opaque", () => {
    const r = detectScreen(new Uint8Array(100).fill(255), 10, 10);
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects a screen that leaks to the edge", () => {
    const r = detectScreen(
      frame(100, 100, { x: 0, y: 30, w: 100, h: 40 }),
      100,
      100,
    );
    expect(r).toMatchObject({
      ok: false,
      message: "The screen area must be fully enclosed by the frame.",
    });
  });
});
