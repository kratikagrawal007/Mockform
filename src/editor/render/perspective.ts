export type PerspectiveId =
  "flat" | "left" | "right" | "back" | "iso-left" | "iso-right";

export interface PerspectivePreset {
  id: PerspectiveId;
  name: string;
  /** Tilt around the horizontal axis; positive leans the top away. */
  pitch: number;
  /** Turn around the vertical axis; positive brings the left edge closer. */
  yaw: number;
}

export const PERSPECTIVES: readonly PerspectivePreset[] = [
  { id: "flat", name: "Flat", pitch: 0, yaw: 0 },
  { id: "left", name: "Turn left", pitch: 0, yaw: 28 },
  { id: "right", name: "Turn right", pitch: 0, yaw: -28 },
  { id: "back", name: "Lean back", pitch: 24, yaw: 0 },
  { id: "iso-left", name: "Isometric left", pitch: 30, yaw: 30 },
  { id: "iso-right", name: "Isometric right", pitch: 30, yaw: -30 },
];

export function getPerspective(
  id: PerspectiveId | undefined,
): PerspectivePreset {
  return PERSPECTIVES.find((p) => p.id === id) ?? PERSPECTIVES[0];
}

export interface ProjectedCorner {
  x: number;
  y: number;
  /** Perspective divisor (≥ 0); used for perspective-correct texture mapping. */
  w: number;
}

/** Camera distance as a multiple of the device's longer side: smaller = stronger perspective. */
const CAMERA = 2.4;

/**
 * Projects the corners of a w×h rectangle centred on the origin, after tilting
 * it. Order: top-left, top-right, bottom-left, bottom-right.
 */
export function projectCorners(
  width: number,
  height: number,
  p: PerspectivePreset,
): ProjectedCorner[] {
  const f = CAMERA * Math.max(width, height);
  const a = (p.pitch * Math.PI) / 180;
  const b = (p.yaw * Math.PI) / 180;
  const corners: [number, number][] = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [-width / 2, height / 2],
    [width / 2, height / 2],
  ];
  return corners.map(([x, y]) => {
    // Yaw: the left edge (x < 0) comes towards the camera for positive yaw.
    const x1 = x * Math.cos(b);
    const z1 = x * Math.sin(b);
    // Pitch: the top edge (y < 0) moves away for positive pitch.
    const y2 = y * Math.cos(a);
    const z2 = -y * Math.sin(a) + z1 * Math.cos(a);
    const w = (f + z2) / f;
    return { x: x1 / w, y: y2 / w, w };
  });
}

export function cornerBounds(corners: ProjectedCorner[]) {
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX,
    minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}
