import { describe, expect, it } from "vitest";
import { exportFileName, exportSize } from "./limits";

describe("exportSize", () => {
  it("multiplies the canvas by the scale", () => {
    expect(exportSize({ width: 1080, height: 1350 }, 3)).toEqual({
      ok: true,
      width: 3240,
      height: 4050,
    });
  });

  it("refuses sides over 16384 px", () => {
    expect(exportSize({ width: 6000, height: 1000 }, 3)).toMatchObject({
      ok: false,
    });
  });

  it("refuses images over 100 megapixels", () => {
    expect(exportSize({ width: 4096, height: 4096 }, 3)).toMatchObject({
      ok: false,
      message: "Too large: the image must be 100 megapixels or less.",
    });
  });
});

describe("exportFileName", () => {
  it("names files by size and format", () => {
    expect(exportFileName({ width: 2160, height: 2700 }, "png")).toBe(
      "mockform-2160x2700.png",
    );
    expect(exportFileName({ width: 10, height: 20 }, "jpeg")).toBe(
      "mockform-10x20.jpg",
    );
  });
});
