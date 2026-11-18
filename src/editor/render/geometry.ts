import type { DeviceGeometry } from "@/editor/devices/catalog";
import type { Crop, DeviceInstance, Rect, Size } from "@/editor/scene/types";

/** At scale 1 the device fills this share of the canvas's tighter side. */
export const DEVICE_FILL = 0.8;
/** The Original canvas is capped so 1× exports stay reasonable. */
export const AUTO_CANVAS_MAX = 4096;
export const MAX_ZOOM = 4;

export interface Placement {
  /** Centre on the canvas, in canvas pixels. */
  cx: number;
  cy: number;
  /** Canvas pixels per frame unit. */
  scale: number;
  /** Radians. */
  rotation: number;
  /** Device size on the canvas before rotation. */
  width: number;
  height: number;
}

export function fitScale(geo: Size, canvas: Size) {
  return Math.min(
    (canvas.width * DEVICE_FILL) / geo.width,
    (canvas.height * DEVICE_FILL) / geo.height,
  );
}

export function placeDevice(
  geo: Size,
  canvas: Size,
  d: Pick<DeviceInstance, "x" | "y" | "scale" | "rotation">,
): Placement {
  const scale = fitScale(geo, canvas) * d.scale;
  return {
    cx: d.x * canvas.width,
    cy: d.y * canvas.height,
    scale,
    rotation: (d.rotation * Math.PI) / 180,
    width: geo.width * scale,
    height: geo.height * scale,
  };
}

/** Converts a canvas point into the device's frame units (undoing position, rotation and scale). */
export function toFrame(place: Placement, geo: Size, px: number, py: number) {
  const dx = px - place.cx;
  const dy = py - place.cy;
  const cos = Math.cos(-place.rotation);
  const sin = Math.sin(-place.rotation);
  return {
    x: (dx * cos - dy * sin) / place.scale + geo.width / 2,
    y: (dx * sin + dy * cos) / place.scale + geo.height / 2,
  };
}

export function hitDevice(place: Placement, geo: Size, px: number, py: number) {
  const p = toFrame(place, geo, px, py);
  return p.x >= 0 && p.y >= 0 && p.x <= geo.width && p.y <= geo.height;
}

/**
 * The "Original" canvas: sized so the screen shows the screenshot at its native
 * resolution, with the device filling 80% of the canvas.
 */
export function autoCanvasSize(geo: DeviceGeometry): Size {
  const pxPerUnit = geo.nativeScreen.width / geo.screen.width;
  let width = (geo.width * pxPerUnit) / DEVICE_FILL;
  let height = (geo.height * pxPerUnit) / DEVICE_FILL;
  const over = Math.max(width, height) / AUTO_CANVAS_MAX;
  if (over > 1) {
    width /= over;
    height /= over;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

const NO_CROP: Crop = { zoom: 1, panX: 0, panY: -1 };

/**
 * Where to draw an image so it covers the box, then zoom and pan within it.
 * The default pan keeps the top of tall screenshots (pages scroll down).
 */
export function coverRect(image: Size, box: Rect, crop: Crop = NO_CROP): Rect {
  const s =
    Math.max(box.width / image.width, box.height / image.height) *
    Math.max(1, crop.zoom);
  const width = image.width * s;
  const height = image.height * s;
  const overX = width - box.width;
  const overY = height - box.height;
  return {
    width,
    height,
    x: box.x - (overX * (crop.panX + 1)) / 2,
    y: box.y - (overY * (crop.panY + 1)) / 2,
  };
}

/** How far the screenshot can pan, in canvas pixels, per unit of pan. */
export function panRange(image: Size, screen: Size, zoom: number): Size {
  const r = coverRect(
    image,
    { x: 0, y: 0, ...screen },
    { zoom, panX: 0, panY: 0 },
  );
  return {
    width: (r.width - screen.width) / 2,
    height: (r.height - screen.height) / 2,
  };
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
