import { describe, expect, it } from "vitest";
import { DEVICES, deviceGeometry, getDevice, getDeviceColor } from "./catalog";

describe("device catalogue", () => {
  it("has 25 built-in devices with unique ids", () => {
    expect(DEVICES).toHaveLength(25);
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(DEVICES.map((d) => [d.name, d] as const))(
    "%s keeps its body and screen inside the frame",
    (_, d) => {
      expect(d.colors.length).toBeGreaterThan(0);
      for (const r of [d.body, d.screen]) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(d.width + 0.001);
        expect(r.y + r.height).toBeLessThanOrEqual(d.height + 0.001);
      }
      // The screen sits inside the body.
      expect(d.screen.x).toBeGreaterThanOrEqual(d.body.x);
      expect(d.screen.y).toBeGreaterThanOrEqual(d.body.y);
      expect(d.screen.x + d.screen.width).toBeLessThanOrEqual(
        d.body.x + d.body.width,
      );
      expect(d.screen.y + d.screen.height).toBeLessThanOrEqual(
        d.body.y + d.body.height,
      );
    },
  );

  it("never uses trademarked product names", () => {
    const names = DEVICES.map((d) => d.name).join(" ");
    expect(names).not.toMatch(
      /iphone|ipad|macbook|imac|pixel|galaxy|apple|samsung|vision pro/i,
    );
  });

  it("falls back to the first device and colour for unknown ids", () => {
    expect(getDevice("nope")).toBe(DEVICES[0]);
    expect(getDeviceColor(DEVICES[0], "nope")).toBe(DEVICES[0].colors[0]);
  });
});

describe("deviceGeometry", () => {
  it("returns the fixed frame for regular devices", () => {
    const spec = getDevice("tablet-11");
    const geo = deviceGeometry(spec, { width: 100, height: 100 });
    expect(geo.width).toBe(spec.width);
    expect(geo.nativeScreen).toEqual({ width: 100, height: 100 });
  });

  it("shapes the frameless device to the screenshot", () => {
    const geo = deviceGeometry(getDevice("frameless"), {
      width: 1600,
      height: 900,
    });
    expect(geo.width).toBe(900);
    expect(geo.height).toBeCloseTo(506.25);
    expect(geo.screen).toMatchObject({ x: 0, y: 0, width: 900 });
  });
});
