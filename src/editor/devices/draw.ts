import { coverRect } from "@/editor/render/geometry";
import type { Crop, Rect } from "@/editor/scene/types";
import type { DeviceColor, DeviceGeometry, DeviceSpec, Radii } from "./catalog";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface ScreenImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

const BEZEL = "#050506";
const EMPTY_SCREEN_TOP = "#15131f";
const EMPTY_SCREEN_BOTTOM = "#26203d";

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: Radii) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillRR(
  ctx: Ctx,
  r: Rect,
  radius: Radii,
  fill: string | CanvasGradient,
) {
  rr(ctx, r.x, r.y, r.width, r.height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function inset(r: Rect, by: number): Rect {
  return {
    x: r.x + by,
    y: r.y + by,
    width: r.width - by * 2,
    height: r.height - by * 2,
  };
}

function shrink(radius: Radii, by: number): Radii {
  return typeof radius === "number"
    ? Math.max(0, radius - by)
    : (radius.map((v) => Math.max(0, v - by)) as [
        number,
        number,
        number,
        number,
      ]);
}

function grow(radius: Radii, by: number): Radii {
  return shrink(radius, -by);
}

/** Vertical gradient from the edge colour into the body colour and back. */
function rim(ctx: Ctx, r: Rect, color: DeviceColor) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.height);
  g.addColorStop(0, color.edge);
  g.addColorStop(0.5, color.body);
  g.addColorStop(1, color.edge);
  return g;
}

function dot(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/* ---------- Screen ---------- */

function drawScreen(
  ctx: Ctx,
  screen: Rect,
  radius: Radii,
  image: ScreenImage | null,
  crop: Crop | undefined,
  glare: boolean,
) {
  ctx.save();
  rr(ctx, screen.x, screen.y, screen.width, screen.height, radius);
  ctx.clip();

  if (image) {
    const d = coverRect(image, screen, crop);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, d.x, d.y, d.width, d.height);
  } else {
    const g = ctx.createLinearGradient(
      0,
      screen.y,
      0,
      screen.y + screen.height,
    );
    g.addColorStop(0, EMPTY_SCREEN_TOP);
    g.addColorStop(1, EMPTY_SCREEN_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  }

  if (glare) {
    // A soft diagonal sheen across the upper-left of the glass.
    const g = ctx.createLinearGradient(
      screen.x,
      screen.y,
      screen.x + screen.width * 0.9,
      screen.y + screen.height * 0.6,
    );
    g.addColorStop(0, "rgba(255,255,255,0.16)");
    g.addColorStop(0.45, "rgba(255,255,255,0.05)");
    g.addColorStop(0.4501, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  }
  ctx.restore();
}

/* ---------- Silhouette (for the drop shadow) ---------- */

/** Traces the device's outer outline, so the shadow always matches the frame. */
export function traceSilhouette(
  ctx: Ctx,
  spec: DeviceSpec,
  geo: DeviceGeometry,
) {
  ctx.beginPath();
  const b = spec.body;
  switch (spec.style) {
    case "frameless":
      ctx.roundRect(0, 0, geo.width, geo.height, geo.screen.radius);
      return;
    case "laptop":
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
      if (spec.base)
        ctx.roundRect(
          spec.base.x,
          spec.base.y,
          spec.base.width,
          spec.base.height,
          [4, 4, 22, 22],
        );
      return;
    case "desktop":
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
      if (spec.stand) {
        const { neck, foot } = spec.stand;
        ctx.rect(neck.x, neck.y, neck.width, neck.height);
        ctx.roundRect(foot.x, foot.y, foot.width, foot.height, [4, 4, 10, 10]);
      }
      return;
    case "watch": {
      const bandW = b.width * 0.74;
      ctx.roundRect(
        b.x + (b.width - bandW) / 2,
        0,
        bandW,
        spec.height,
        bandW * 0.3,
      );
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
      return;
    }
    default:
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
  }
}

/* ---------- Styles ---------- */

function drawCamera(ctx: Ctx, spec: DeviceSpec, screen: Rect) {
  const w = screen.width;
  switch (spec.camera) {
    case "island":
      fillRR(
        ctx,
        {
          x: screen.x + w * 0.345,
          y: screen.y + w * 0.027,
          width: w * 0.31,
          height: w * 0.09,
        },
        w * 0.045,
        "#000",
      );
      break;
    case "punch":
      dot(ctx, screen.x + w / 2, screen.y + w * 0.061, w * 0.025, "#000");
      break;
    case "notch": {
      const nw = w * 0.42;
      const nh = w * 0.078;
      fillRR(
        ctx,
        {
          x: screen.x + (w - nw) / 2,
          y: screen.y - 1,
          width: nw,
          height: nh + 1,
        },
        [0, 0, nh * 0.6, nh * 0.6],
        "#000",
      );
      break;
    }
    case "dot": {
      const b = spec.body;
      const landscape =
        screen.width > screen.height && spec.style === "handheld";
      const cy = landscape ? b.y + b.height / 2 : (b.y + screen.y) / 2;
      const cx = landscape ? (b.x + screen.x) / 2 : b.x + b.width / 2;
      dot(
        ctx,
        cx,
        cy,
        Math.max(3, Math.min(6, (screen.y - b.y) * 0.18)),
        "#1c1c22",
      );
      break;
    }
  }
}

function drawHandheld(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  for (const [side, start, length] of spec.buttons ?? []) {
    const x = side === "left" ? b.x - 4 : b.x + b.width;
    fillRR(
      ctx,
      { x, y: b.y + start * b.height, width: 4, height: length * b.height },
      2,
      color.body,
    );
  }
  fillRR(ctx, b, b.radius, rim(ctx, b, color));
  fillRR(ctx, inset(b, 3), shrink(b.radius, 3), color.face ?? color.body);
  const ring = spec.ring ?? 5;
  const s = spec.screen;
  if (!color.face) {
    // Modern design: black glass runs almost to the edge.
    fillRR(ctx, inset(b, 9), shrink(b.radius, 9), BEZEL);
  } else {
    fillRR(
      ctx,
      {
        x: s.x - ring,
        y: s.y - ring,
        width: s.width + ring * 2,
        height: s.height + ring * 2,
      },
      grow(s.radius, ring),
      BEZEL,
    );
  }
  screenFn();
  drawCamera(ctx, spec, s);

  if (spec.homeButton) {
    const bottom = b.y + b.height - (s.y + s.height);
    const cx = b.x + b.width / 2;
    const cy = s.y + s.height + bottom / 2;
    const r = Math.min(bottom * 0.32, 34);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(128,128,128,0.45)";
    ctx.stroke();
    // Earpiece and front camera above the screen.
    const top = s.y - b.y;
    fillRR(
      ctx,
      { x: cx - 34, y: b.y + top / 2 - 4, width: 68, height: 8 },
      4,
      "rgba(80,80,80,0.55)",
    );
    dot(ctx, cx - 62, b.y + top / 2, 5, "rgba(40,40,40,0.7)");
  }
}

function drawLaptop(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  fillRR(ctx, b, b.radius, rim(ctx, b, color));
  fillRR(ctx, inset(b, 3), shrink(b.radius, 3), BEZEL);
  screenFn();
  drawCamera(ctx, spec, spec.screen);
  if (spec.base) {
    const base = spec.base;
    const g = ctx.createLinearGradient(0, base.y, 0, base.y + base.height);
    g.addColorStop(0, color.edge);
    g.addColorStop(0.35, color.body);
    g.addColorStop(1, color.body);
    fillRR(ctx, base, [4, 4, 22, 22], g);
    const notch = base.width * 0.124;
    fillRR(
      ctx,
      {
        x: base.x + (base.width - notch) / 2,
        y: base.y,
        width: notch,
        height: base.height * 0.3,
      },
      [0, 0, 8, 8],
      "rgba(0,0,0,0.22)",
    );
  }
}

function drawDesktop(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  if (spec.stand) {
    const { neck, foot } = spec.stand;
    const g = ctx.createLinearGradient(neck.x, 0, neck.x + neck.width, 0);
    g.addColorStop(0, color.body);
    g.addColorStop(0.5, color.edge);
    g.addColorStop(1, color.body);
    ctx.fillStyle = g;
    ctx.fillRect(neck.x, neck.y, neck.width, neck.height);
    fillRR(ctx, foot, [4, 4, 10, 10], color.body);
  }
  fillRR(ctx, b, b.radius, rim(ctx, b, color));
  const s = spec.screen;
  if (spec.ring) {
    // Coloured chin below a black glass panel.
    fillRR(ctx, inset(b, 3), shrink(b.radius, 3), color.body);
    const r = spec.ring;
    fillRR(
      ctx,
      {
        x: s.x - r,
        y: s.y - r,
        width: s.width + r * 2,
        height: s.height + r * 2,
      },
      10,
      BEZEL,
    );
  } else {
    fillRR(ctx, inset(b, 4), shrink(b.radius, 4), BEZEL);
  }
  screenFn();
  drawCamera(ctx, spec, s);
}

function drawWatch(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  const bandW = b.width * 0.74;
  const bx = b.x + (b.width - bandW) / 2;
  fillRR(
    ctx,
    { x: bx, y: 0, width: bandW, height: spec.height },
    bandW * 0.3,
    color.band ?? color.body,
  );
  // Crown and side button.
  fillRR(
    ctx,
    { x: b.x + b.width - 4, y: b.y + b.height * 0.28, width: 18, height: 70 },
    6,
    rim(ctx, b, color),
  );
  fillRR(
    ctx,
    { x: b.x + b.width - 4, y: b.y + b.height * 0.5, width: 12, height: 80 },
    4,
    color.body,
  );
  fillRR(ctx, b, b.radius, rim(ctx, b, color));
  fillRR(ctx, inset(b, 4), shrink(b.radius, 4), BEZEL);
  screenFn();
}

function drawWindow(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  const face = color.face ?? color.body;
  fillRR(ctx, b, b.radius, color.edge);
  fillRR(ctx, inset(b, 1), shrink(b.radius, 1), color.body);
  const dots = (y: number) => {
    for (let i = 0; i < 3; i++) dot(ctx, 26 + i * 22, y, 6.5, color.edge);
  };
  const w = b.width;
  switch (spec.chrome) {
    case "browser":
      dots(26);
      fillRR(
        ctx,
        { x: w / 2 - 260, y: 11, width: 520, height: 30 },
        15,
        color.edge,
      );
      break;
    case "tabs":
      dots(22);
      fillRR(
        ctx,
        { x: 96, y: 8, width: 240, height: 36 },
        [10, 10, 0, 0],
        face,
      );
      fillRR(ctx, { x: 116, y: 22, width: 120, height: 8 }, 4, color.edge);
      ctx.fillStyle = face;
      ctx.fillRect(1, 44, w - 2, 44);
      fillRR(
        ctx,
        { x: 120, y: 52, width: w - 240, height: 28 },
        14,
        color.body,
      );
      break;
    case "app":
      dots(20);
      fillRR(
        ctx,
        { x: w / 2 - 80, y: 14, width: 160, height: 12 },
        6,
        color.edge,
      );
      break;
  }
  screenFn();
}

function drawGlass(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  fillRR(ctx, b, b.radius, color.body);
  rr(ctx, b.x + 1, b.y + 1, b.width - 2, b.height - 2, shrink(b.radius, 1));
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.edge;
  ctx.stroke();
  const sheen = ctx.createLinearGradient(0, b.y, 0, b.y + b.height * 0.5);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  fillRR(ctx, b, b.radius, sheen);
  screenFn();
  // Window handle below the panel.
  fillRR(
    ctx,
    {
      x: b.x + b.width / 2 - 70,
      y: b.y + b.height + 24,
      width: 140,
      height: 12,
    },
    6,
    "rgba(255,255,255,0.6)",
  );
}

/**
 * Draws a device in frame units, with its top-left corner at (0, 0).
 * The editor, the device thumbnails and the exporter all use this function.
 */
export function drawDevice(
  ctx: Ctx,
  spec: DeviceSpec,
  geo: DeviceGeometry,
  color: DeviceColor,
  image: ScreenImage | null,
  glare: boolean,
  crop?: Crop,
) {
  const screenFn = (useGlare = glare) =>
    drawScreen(ctx, geo.screen, geo.screen.radius, image, crop, useGlare);
  switch (spec.style) {
    case "handheld":
      return drawHandheld(ctx, spec, color, () => screenFn());
    case "laptop":
      return drawLaptop(ctx, spec, color, () => screenFn());
    case "desktop":
      return drawDesktop(ctx, spec, color, () => screenFn());
    case "watch":
      return drawWatch(ctx, spec, color, () => screenFn());
    case "window":
      return drawWindow(ctx, spec, color, () => screenFn(false));
    case "glass":
      return drawGlass(ctx, spec, color, () => screenFn(false));
    case "frameless":
      return screenFn(false);
    case "custom":
      screenFn(false);
      if (spec.frame) ctx.drawImage(spec.frame, 0, 0, spec.width, spec.height);
      return;
  }
}

/** Whether the glare switch does anything on this device. */
export function hasGlass(spec: DeviceSpec) {
  return ["handheld", "laptop", "desktop", "watch"].includes(spec.style);
}
