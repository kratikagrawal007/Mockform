import { describe, expect, it } from "vitest";
import { deviceGeometry, getDevice } from "@/editor/devices/catalog";
import {
  AUTO_CANVAS_MAX,
  autoCanvasSize,
  coverRect,
  hitDevice,
  panRange,
  placeDevice,
  toFrame,
} from "./geometry";

const centred = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };

describe("placeDevice", () => {
  it("fits a tall device by height and centres it", () => {
    const p = placeDevice(
      { width: 400, height: 800 },
      { width: 1000, height: 1000 },
      centred,
    );
    expect(p.scale).toBeCloseTo(1);
    expect(p).toMatchObject({ cx: 500, cy: 500, width: 400, height: 800 });
  });

  it("applies scale, position and rotation", () => {
    const p = placeDevice(
      { width: 400, height: 800 },
      { width: 1000, height: 1000 },
      { x: 0.6, y: 0.3, scale: 0.5, rotation: 90 },
    );
    expect(p.scale).toBeCloseTo(0.5);
    expect(p.cx).toBeCloseTo(600);
    expect(p.cy).toBeCloseTo(300);
    expect(p.rotation).toBeCloseTo(Math.PI / 2);
  });
});

describe("toFrame and hitDevice", () => {
  const geo = { width: 100, height: 200 };
  const canvas = { width: 1000, height: 1000 };

  it("maps the centre of the device to the centre of the frame", () => {
    const p = placeDevice(geo, canvas, centred);
    expect(toFrame(p, geo, 500, 500)).toEqual({ x: 50, y: 100 });
  });

  it("accounts for rotation when hit-testing", () => {
    const p = placeDevice(geo, canvas, { ...centred, rotation: 90 });
    // Rotated 90°, the tall device is now wide: a point far to the right is inside…
    expect(hitDevice(p, geo, 500 + p.height / 2 - 5, 500)).toBe(true);
    // …and a point far below is outside.
    expect(hitDevice(p, geo, 500, 500 + p.height / 2 - 5)).toBe(false);
  });
});

describe("autoCanvasSize", () => {
  it("keeps the screenshot at native resolution", () => {
    const geo = deviceGeometry(getDevice("phone-pro-63"), {
      width: 1206,
      height: 2622,
    });
    const size = autoCanvasSize(geo);
    const place = placeDevice(geo, size, centred);
    expect(geo.screen.width * place.scale).toBeCloseTo(1206, -1);
  });

  it("caps very large canvases", () => {
    const geo = deviceGeometry(getDevice("laptop-14"));
    const size = autoCanvasSize(geo);
    expect(Math.max(size.width, size.height)).toBe(AUTO_CANVAS_MAX);
  });
});

describe("coverRect", () => {
  it("fills a box of the same shape exactly", () => {
    expect(
      coverRect(
        { width: 100, height: 200 },
        { x: 10, y: 10, width: 50, height: 100 },
      ),
    ).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 100,
    });
  });

  it("keeps the top of a tall screenshot by default", () => {
    const r = coverRect(
      { width: 100, height: 1000 },
      { x: 0, y: 0, width: 100, height: 200 },
    );
    expect(r).toMatchObject({ x: 0, y: 0, width: 100, height: 1000 });
  });

  it("centres a wide image horizontally by default", () => {
    const r = coverRect(
      { width: 400, height: 100 },
      { x: 0, y: 0, width: 100, height: 100 },
    );
    expect(r.x).toBe(-150);
    expect(r.y).toBe(0);
  });

  it("zooms and pans within the overflow", () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const r = coverRect({ width: 100, height: 100 }, box, {
      zoom: 2,
      panX: 1,
      panY: -1,
    });
    expect(r).toEqual({ x: -100, y: 0, width: 200, height: 200 });
  });

  it("treats zoom below 1 as 1", () => {
    const r = coverRect(
      { width: 100, height: 100 },
      { x: 0, y: 0, width: 100, height: 100 },
      { zoom: 0.5, panX: 0, panY: 0 },
    );
    expect(r.width).toBe(100);
  });
});

describe("panRange", () => {
  it("is half the overflow on each axis", () => {
    expect(
      panRange({ width: 100, height: 100 }, { width: 100, height: 100 }, 2),
    ).toEqual({ width: 50, height: 50 });
    expect(
      panRange({ width: 100, height: 100 }, { width: 100, height: 100 }, 1),
    ).toEqual({ width: 0, height: 0 });
  });
});
