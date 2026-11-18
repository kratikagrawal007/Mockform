import { describe, expect, it } from "vitest";
import {
  CANVAS_MAX,
  CANVAS_MIN,
  clampDimension,
  fitInside,
  getPreset,
} from "./canvas";

describe("getPreset", () => {
  it("returns the matching preset", () => {
    expect(getPreset("wide")).toMatchObject({ width: 1920, height: 1080 });
  });
});

describe("clampDimension", () => {
  it("rounds and clamps to the allowed range", () => {
    expect(clampDimension(1200.6, 100)).toBe(1201);
    expect(clampDimension(10, 100)).toBe(CANVAS_MIN);
    expect(clampDimension(99999, 100)).toBe(CANVAS_MAX);
  });

  it("uses the fallback for non-numbers", () => {
    expect(clampDimension(Number.NaN, 1080)).toBe(1080);
  });
});

describe("fitInside", () => {
  it("fits a portrait canvas by height", () => {
    expect(
      fitInside({ width: 1080, height: 1350 }, { width: 800, height: 600 }),
    ).toEqual({
      width: 480,
      height: 600,
    });
  });

  it("fits a wide canvas by width", () => {
    expect(
      fitInside({ width: 1920, height: 1080 }, { width: 800, height: 600 }),
    ).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("returns zero for an empty box", () => {
    expect(
      fitInside({ width: 100, height: 100 }, { width: 0, height: 300 }),
    ).toEqual({
      width: 0,
      height: 0,
    });
  });
});
