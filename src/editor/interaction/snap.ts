export interface Guide {
  axis: "x" | "y";
  /** Position as a fraction of the canvas. */
  at: number;
}

/**
 * Snaps a device centre to the canvas centre lines and to other devices'
 * centres when it's within `threshold` (a fraction of the canvas).
 */
export function snapPosition(
  x: number,
  y: number,
  others: { x: number; y: number }[],
  threshold: { x: number; y: number },
): { x: number; y: number; guides: Guide[] } {
  const xs = [0.5, ...others.map((o) => o.x)];
  const ys = [0.5, ...others.map((o) => o.y)];
  const guides: Guide[] = [];
  const nearest = (v: number, targets: number[], t: number) => {
    let best: number | null = null;
    for (const c of targets)
      if (
        Math.abs(c - v) <= t &&
        (best === null || Math.abs(c - v) < Math.abs(best - v))
      )
        best = c;
    return best;
  };
  const sx = nearest(x, xs, threshold.x);
  const sy = nearest(y, ys, threshold.y);
  if (sx !== null) guides.push({ axis: "x", at: sx });
  if (sy !== null) guides.push({ axis: "y", at: sy });
  return { x: sx ?? x, y: sy ?? y, guides };
}

/** Snaps an angle (degrees) to multiples of 15° when within 4°. Result is in -180..180. */
export function snapAngle(deg: number, free = false): number {
  let a = ((((deg + 180) % 360) + 360) % 360) - 180;
  if (!free) {
    const nearest = Math.round(a / 15) * 15;
    if (Math.abs(nearest - a) <= 4) a = nearest;
  }
  // "|| 0" turns -0 into 0.
  return Math.round(a * 10) / 10 || 0;
}
