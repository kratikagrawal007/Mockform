import { describe, expect, it } from "vitest";
import { luminance, parseHex, rgba, shade } from "./material";

describe("colour helpers", () => {
  it("parses hex colours", () => {
    expect(parseHex("#ff8000")).toEqual([255, 128, 0]);
    expect(parseHex("rgba(0,0,0,1)")).toBeNull();
  });

  it("lightens and darkens", () => {
    expect(shade("#808080", 0.5)).toBe("#c0c0c0");
    expect(shade("#808080", -0.5)).toBe("#404040");
    expect(shade("rgba(1,2,3,0.5)", 0.5)).toBe("rgba(1,2,3,0.5)");
  });

  it("measures brightness and builds rgba strings", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000000")).toBe(0);
    expect(rgba("#ff0000", 0.25)).toBe("rgba(255,0,0,0.25)");
  });
});
