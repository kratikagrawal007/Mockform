import { describe, expect, it } from "vitest";
import {
  PERSPECTIVES,
  cornerBounds,
  getPerspective,
  projectCorners,
} from "./perspective";

describe("projectCorners", () => {
  it("leaves a flat device unchanged", () => {
    const c = projectCorners(100, 200, getPerspective("flat"));
    expect(c.map(({ x, y }) => [x, y])).toEqual([
      [-50, -100],
      [50, -100],
      [-50, 100],
      [50, 100],
    ]);
    expect(c.every((p) => p.w === 1)).toBe(true);
  });

  it("turning left makes the left edge taller than the right", () => {
    const [tl, tr, bl, br] = projectCorners(100, 200, getPerspective("left"));
    expect(bl.y - tl.y).toBeGreaterThan(br.y - tr.y);
  });

  it("turning right is the mirror image of turning left", () => {
    const l = projectCorners(100, 200, getPerspective("left"));
    const r = projectCorners(100, 200, getPerspective("right"));
    expect(r[0].x).toBeCloseTo(-l[1].x);
    expect(r[0].y).toBeCloseTo(l[1].y);
  });

  it("leaning back makes the top edge narrower than the bottom", () => {
    const [tl, tr, bl, br] = projectCorners(100, 200, getPerspective("back"));
    expect(tr.x - tl.x).toBeLessThan(br.x - bl.x);
  });

  it("never puts a corner behind the camera", () => {
    for (const p of PERSPECTIVES) {
      for (const c of projectCorners(1000, 2000, p))
        expect(c.w).toBeGreaterThan(0.2);
    }
  });
});

describe("cornerBounds", () => {
  it("measures the projected box", () => {
    expect(
      cornerBounds(projectCorners(100, 200, getPerspective("flat"))),
    ).toEqual({
      minX: -50,
      minY: -100,
      width: 100,
      height: 200,
    });
  });
});
