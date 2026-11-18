import { describe, expect, it } from "vitest";
import { snapAngle, snapPosition } from "./snap";

const t = { x: 0.01, y: 0.01 };

describe("snapPosition", () => {
  it("snaps to the canvas centre and reports guides", () => {
    expect(snapPosition(0.505, 0.3, [], t)).toEqual({
      x: 0.5,
      y: 0.3,
      guides: [{ axis: "x", at: 0.5 }],
    });
  });

  it("snaps to another device's centre", () => {
    const out = snapPosition(0.2, 0.708, [{ x: 0.8, y: 0.7 }], t);
    expect(out.y).toBe(0.7);
    expect(out.guides).toEqual([{ axis: "y", at: 0.7 }]);
  });

  it("leaves far positions alone", () => {
    expect(snapPosition(0.3, 0.3, [], t)).toEqual({
      x: 0.3,
      y: 0.3,
      guides: [],
    });
  });
});

describe("snapAngle", () => {
  it("snaps near multiples of 15°", () => {
    expect(snapAngle(13)).toBe(15);
    expect(snapAngle(-2)).toBe(0);
    expect(snapAngle(22)).toBe(22);
  });

  it("wraps into -180..180 and can be turned off", () => {
    expect(snapAngle(370)).toBe(10);
    expect(snapAngle(-190)).toBe(170);
    expect(snapAngle(13, true)).toBe(13);
  });
});
