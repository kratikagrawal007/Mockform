import { describe, expect, it } from "vitest";
import { extractPalette, gradientFromPalette } from "./matchColors";

function pixels(colors: [number, number, number, number][]) {
  return new Uint8ClampedArray(colors.flat());
}

describe("extractPalette", () => {
  it("prefers vivid colours over large areas of white", () => {
    const white = Array.from(
      { length: 60 },
      () => [255, 255, 255, 255] as [number, number, number, number],
    );
    const violet = Array.from(
      { length: 25 },
      () => [109, 74, 255, 255] as [number, number, number, number],
    );
    const coral = Array.from(
      { length: 15 },
      () => [255, 122, 89, 255] as [number, number, number, number],
    );
    const palette = extractPalette(pixels([...white, ...violet, ...coral]));
    expect(palette[0]).toBe("#6d4aff");
    expect(palette).toContain("#ff7a59");
  });

  it("skips transparent pixels and near-duplicate colours", () => {
    const palette = extractPalette(
      pixels([
        [0, 200, 0, 0],
        [10, 10, 200, 255],
        [12, 12, 202, 255],
      ]),
    );
    expect(palette).toHaveLength(1);
  });
});

describe("extractPalette on a mostly white app screen", () => {
  it("leads with the accent colour, not the white background", () => {
    const px: [number, number, number, number][] = [
      ...Array.from(
        { length: 300 },
        () => [253, 252, 251, 255] as [number, number, number, number],
      ),
      ...Array.from(
        { length: 30 },
        () => [47, 214, 163, 255] as [number, number, number, number],
      ),
    ];
    expect(extractPalette(pixels(px))[0]).toBe("#2fd6a3");
  });
});

describe("gradientFromPalette", () => {
  it("builds a matched gradient with a darker base", () => {
    const g = gradientFromPalette(["#ffffff", "#000000"]);
    expect(g.id).toBe("matched");
    expect(g.blobs.map((b) => b.color)).toEqual([
      "#ffffff",
      "#000000",
      "#000000",
    ]);
    expect(g.base).toBe("#474747");
  });
});
