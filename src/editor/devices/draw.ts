import { coverRect } from "@/editor/render/geometry";
import type { Crop, Rect } from "@/editor/scene/types";
import type { DeviceColor, DeviceGeometry, DeviceSpec, Radii } from "./catalog";
import { luminance, rgba, shade } from "./material";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface ScreenImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

const GLASS_TOP = "#141417";
const GLASS_BOTTOM = "#050506";
const EMPTY_SCREEN_TOP = "#15131f";
const EMPTY_SCREEN_BOTTOM = "#26203d";

/* ---------- Path helpers ---------- */

function rr(ctx: Ctx, r: Rect, radius: Radii) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.width, r.height, radius);
}

function fillRR(
  ctx: Ctx,
  r: Rect,
  radius: Radii,
  fill: string | CanvasGradient,
) {
  rr(ctx, r, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRR(
  ctx: Ctx,
  r: Rect,
  radius: Radii,
  stroke: string | CanvasGradient,
  width: number,
) {
  rr(ctx, r, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
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

function dot(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string | CanvasGradient,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function vertical(ctx: Ctx, r: Rect, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.height);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

function horizontal(ctx: Ctx, r: Rect, stops: [number, string][]) {
  const g = ctx.createLinearGradient(r.x, 0, r.x + r.width, 0);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

/* ---------- Materials ---------- */

/**
 * A metal shell: dark silhouette edge, the base colour lit from above-left,
 * and a thin polished bevel that catches the light.
 */
function metalShell(ctx: Ctx, r: Rect, radius: Radii, color: DeviceColor) {
  const light = luminance(color.body);
  // Silhouette edge: a touch darker than the metal so the outline reads on any background.
  fillRR(ctx, r, radius, shade(color.body, light > 0.7 ? -0.28 : -0.45));
  const body = inset(r, 0.8);
  const bodyR = shrink(radius, 0.8);
  fillRR(ctx, body, bodyR, color.body);
  // Top light / bottom shade, then left light / right shade.
  fillRR(
    ctx,
    body,
    bodyR,
    vertical(ctx, body, [
      [0, "rgba(255,255,255,0.32)"],
      [0.18, "rgba(255,255,255,0.06)"],
      [0.6, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.22)"],
    ]),
  );
  fillRR(
    ctx,
    body,
    bodyR,
    horizontal(ctx, body, [
      [0, "rgba(255,255,255,0.22)"],
      [0.06, "rgba(255,255,255,0)"],
      [0.94, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.2)"],
    ]),
  );
  // Light wraps around the frame: surfaces facing the top-left catch it, the
  // bottom-right falls into shade. A conic gradient around the centre does that.
  if ("createConicGradient" in ctx) {
    const cx = body.x + body.width / 2;
    const cy = body.y + body.height / 2;
    const conic = ctx.createConicGradient(0, cx, cy);
    conic.addColorStop(0, "rgba(0,0,0,0.08)"); // right
    conic.addColorStop(0.18, "rgba(0,0,0,0.28)"); // bottom-right
    conic.addColorStop(0.4, "rgba(255,255,255,0.04)"); // bottom-left
    conic.addColorStop(0.58, "rgba(255,255,255,0.18)"); // left
    conic.addColorStop(0.66, "rgba(255,255,255,0.42)"); // top-left highlight
    conic.addColorStop(0.75, "rgba(255,255,255,0.14)"); // top
    conic.addColorStop(0.88, "rgba(0,0,0,0.02)"); // top-right
    conic.addColorStop(1, "rgba(0,0,0,0.08)");
    fillRR(ctx, body, bodyR, conic);
  }
  // Polished bevel line just inside the edge, brightest at the top.
  strokeRR(
    ctx,
    inset(r, 2.2),
    shrink(radius, 2.2),
    vertical(ctx, r, [
      [0, rgba(color.edge, 0.95)],
      [0.5, rgba(color.edge, 0.35)],
      [1, rgba(color.edge, 0.7)],
    ]),
    1.4,
  );
}

/** Black front glass with a faint sheen and a crisp edge. */
function frontGlass(ctx: Ctx, r: Rect, radius: Radii, fill?: string) {
  fillRR(
    ctx,
    r,
    radius,
    fill ??
      vertical(ctx, r, [
        [0, GLASS_TOP],
        [1, GLASS_BOTTOM],
      ]),
  );
  // Where metal meets glass: a dark seam, then a hairline highlight on the glass edge.
  strokeRR(ctx, r, radius, "rgba(0,0,0,0.65)", 1.2);
  strokeRR(
    ctx,
    inset(r, 1.4),
    shrink(radius, 1.4),
    "rgba(255,255,255,0.07)",
    1,
  );
}

/** A side button: a small rounded bar shaded like a cylinder. */
function button(ctx: Ctx, r: Rect, color: DeviceColor, side: "left" | "right") {
  const outer = side === "left" ? 0 : 1;
  fillRR(
    ctx,
    r,
    Math.min(r.width, 2.4),
    horizontal(ctx, r, [
      [outer, shade(color.body, -0.35)],
      [0.5, color.edge],
      [1 - outer, shade(color.body, -0.1)],
    ]),
  );
  fillRR(
    ctx,
    r,
    Math.min(r.width, 2.4),
    vertical(ctx, r, [
      [0, "rgba(255,255,255,0.25)"],
      [0.12, "rgba(255,255,255,0)"],
      [0.88, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.3)"],
    ]),
  );
}

/** A camera lens: dark glass with a coloured coating and a pin-point reflection. */
function lens(ctx: Ctx, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.3,
    r * 0.1,
    x,
    y,
    r,
  );
  g.addColorStop(0, "#2a3550");
  g.addColorStop(0.55, "#0d1220");
  g.addColorStop(1, "#05070c");
  dot(ctx, x, y, r, g);
  dot(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, "rgba(170,200,255,0.55)");
}

/* ---------- Screen ---------- */

function drawScreen(
  ctx: Ctx,
  screen: Rect,
  radius: Radii,
  image: ScreenImage | null,
  crop: Crop | undefined,
  glare: boolean,
  bezelShadow = true,
) {
  ctx.save();
  rr(ctx, screen, radius);
  ctx.clip();

  if (image) {
    const d = coverRect(image, screen, crop);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, d.x, d.y, d.width, d.height);
  } else {
    ctx.fillStyle = vertical(ctx, screen, [
      [0, EMPTY_SCREEN_TOP],
      [1, EMPTY_SCREEN_BOTTOM],
    ]);
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  }

  if (bezelShadow) {
    // A whisper of inner shadow where the bezel meets the display.
    const pad = 40;
    ctx.beginPath();
    ctx.rect(
      screen.x - pad,
      screen.y - pad,
      screen.width + pad * 2,
      screen.height + pad * 2,
    );
    ctx.roundRect(screen.x, screen.y, screen.width, screen.height, radius);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = Math.max(2, Math.min(screen.width, screen.height) * 0.012);
    ctx.fillStyle = "#000";
    ctx.fill("evenodd");
    ctx.shadowColor = "transparent";
  }

  if (glare) {
    // Soft reflection of a light source above-left: broad, faint, no hard edges.
    const long = Math.max(screen.width, screen.height);
    const g = ctx.createLinearGradient(
      screen.x,
      screen.y,
      screen.x + long * 0.55,
      screen.y + long * 0.75,
    );
    g.addColorStop(0, "rgba(255,255,255,0.13)");
    g.addColorStop(0.35, "rgba(255,255,255,0.045)");
    g.addColorStop(0.7, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
    // Edge catch-light along the top of the glass.
    const top = ctx.createLinearGradient(
      0,
      screen.y,
      0,
      screen.y + screen.height * 0.04,
    );
    top.addColorStop(0, "rgba(255,255,255,0.08)");
    top.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = top;
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height * 0.04);
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
    case "glass":
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
      return;
    default:
      ctx.roundRect(b.x, b.y, b.width, b.height, b.radius);
  }
}

/* ---------- Cameras ---------- */

function drawCamera(ctx: Ctx, spec: DeviceSpec, screen: Rect) {
  const w = screen.width;
  switch (spec.camera) {
    case "island": {
      const r = {
        x: screen.x + w * 0.345,
        y: screen.y + w * 0.027,
        width: w * 0.31,
        height: w * 0.09,
      };
      fillRR(ctx, r, r.height / 2, "#000");
      lens(
        ctx,
        r.x + r.width - r.height / 2,
        r.y + r.height / 2,
        r.height * 0.26,
      );
      break;
    }
    case "punch": {
      const cx = screen.x + w / 2;
      const cy = screen.y + w * 0.061;
      dot(ctx, cx, cy, w * 0.025, "#000");
      lens(ctx, cx, cy, w * 0.016);
      break;
    }
    case "notch": {
      const nw = w * 0.42;
      const nh = w * 0.078;
      const x = screen.x + (w - nw) / 2;
      fillRR(
        ctx,
        { x, y: screen.y - 1, width: nw, height: nh + 1 },
        [0, 0, nh * 0.6, nh * 0.6],
        "#000",
      );
      // Speaker grille and front camera inside the notch.
      fillRR(
        ctx,
        {
          x: x + nw * 0.36,
          y: screen.y + nh * 0.18,
          width: nw * 0.28,
          height: nh * 0.12,
        },
        nh,
        "#1c1c1f",
      );
      lens(ctx, x + nw * 0.76, screen.y + nh * 0.42, nh * 0.17);
      break;
    }
    case "dot": {
      const b = spec.body;
      const landscape =
        screen.width > screen.height && spec.style === "handheld";
      const cy = landscape ? b.y + b.height / 2 : (b.y + screen.y) / 2;
      const cx = landscape ? (b.x + screen.x) / 2 : b.x + b.width / 2;
      lens(
        ctx,
        cx,
        cy,
        Math.max(
          3,
          Math.min(6, (landscape ? screen.x - b.x : screen.y - b.y) * 0.18),
        ),
      );
      break;
    }
  }
}

/* ---------- Styles ---------- */

function drawHandheld(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  for (const [side, start, length] of spec.buttons ?? []) {
    const x = side === "left" ? b.x - 4 : b.x + b.width - 0.5;
    button(
      ctx,
      { x, y: b.y + start * b.height, width: 4.5, height: length * b.height },
      color,
      side,
    );
  }
  metalShell(ctx, b, b.radius, color);

  const s = spec.screen;
  if (!color.face) {
    // Modern design: the glass covers almost the whole front.
    const ring = 8;
    frontGlass(ctx, inset(b, ring), shrink(b.radius, ring));
    // Antenna lines: thin breaks in the metal band, near each corner.
    if (spec.buttons?.length) {
      ctx.fillStyle = rgba(shade(color.body, -0.4), 0.55);
      for (const fy of [0.11, 0.89]) {
        ctx.fillRect(b.x, b.y + b.height * fy, ring, 2.2);
        ctx.fillRect(b.x + b.width - ring, b.y + b.height * fy, ring, 2.2);
      }
    }
  } else {
    // Classic design: a coloured front with a black glass panel around the screen.
    const face = inset(b, 3.5);
    fillRR(
      ctx,
      face,
      shrink(b.radius, 3.5),
      vertical(ctx, face, [
        [0, shade(color.face, 0.02)],
        [1, shade(color.face, -0.04)],
      ]),
    );
    strokeRR(ctx, face, shrink(b.radius, 3.5), "rgba(0,0,0,0.25)", 1);
    const ring = spec.ring ?? 5;
    frontGlass(
      ctx,
      {
        x: s.x - ring,
        y: s.y - ring,
        width: s.width + ring * 2,
        height: s.height + ring * 2,
      },
      grow(s.radius, ring),
    );
  }
  screenFn();
  drawCamera(ctx, spec, s);

  if (spec.homeButton && color.face) {
    const bottom = b.y + b.height - (s.y + s.height);
    const cx = b.x + b.width / 2;
    const cy = s.y + s.height + bottom / 2;
    const r = Math.min(bottom * 0.32, 34);
    const darkFace = luminance(color.face) < 0.3;
    dot(ctx, cx, cy, r, darkFace ? "#0a0a0b" : shade(color.face, -0.03));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = vertical(
      ctx,
      { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      [
        [0, darkFace ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"],
        [1, rgba(color.edge, 0.9)],
      ],
    );
    ctx.stroke();
    // Earpiece and front camera above the screen.
    const top = s.y - b.y;
    fillRR(
      ctx,
      { x: cx - 34, y: b.y + top / 2 - 4, width: 68, height: 8 },
      4,
      darkFace ? "#1d1d20" : "#bdbdc2",
    );
    lens(ctx, cx - 62, b.y + top / 2, 5);
  }
}

function drawLaptop(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  metalShell(ctx, b, b.radius, color);
  frontGlass(ctx, inset(b, 4), shrink(b.radius, 4));
  screenFn();
  drawCamera(ctx, spec, spec.screen);
  if (!spec.base) return;

  const base = spec.base;
  const radius: Radii = [4, 4, base.height * 0.65, base.height * 0.65];
  // The slab: lit top edge, metal face darkening downwards, dark underside.
  fillRR(ctx, base, radius, shade(color.body, -0.35));
  const face = inset(base, 0.8);
  fillRR(
    ctx,
    face,
    radius,
    vertical(ctx, face, [
      [0, shade(color.edge, 0.15)],
      [0.12, color.edge],
      [0.3, color.body],
      [0.75, shade(color.body, -0.12)],
      [1, shade(color.body, -0.38)],
    ]),
  );
  // Specular sweep along the front lip.
  fillRR(
    ctx,
    face,
    radius,
    horizontal(ctx, face, [
      [0, "rgba(0,0,0,0.25)"],
      [0.12, "rgba(255,255,255,0)"],
      [0.5, "rgba(255,255,255,0.18)"],
      [0.88, "rgba(255,255,255,0)"],
      [1, "rgba(0,0,0,0.25)"],
    ]),
  );
  // Hinge: the lid casts a thin dark line onto the base.
  ctx.fillStyle = vertical(ctx, { x: 0, y: base.y, width: 0, height: 5 }, [
    [0, "rgba(0,0,0,0.55)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillRect(b.x + 6, base.y, b.width - 12, 5);
  // Thumb scoop.
  const notchW = base.width * 0.124;
  const notch = {
    x: base.x + (base.width - notchW) / 2,
    y: base.y,
    width: notchW,
    height: base.height * 0.34,
  };
  fillRR(
    ctx,
    notch,
    [0, 0, notch.height, notch.height],
    vertical(ctx, notch, [
      [0, "rgba(0,0,0,0.35)"],
      [1, "rgba(0,0,0,0.08)"],
    ]),
  );
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
    // Brushed-metal neck, shaded like a curved surface, darker where it meets the display.
    ctx.fillStyle = horizontal(ctx, neck, [
      [0, shade(color.body, -0.3)],
      [0.18, color.body],
      [0.45, shade(color.edge, 0.1)],
      [0.7, color.body],
      [1, shade(color.body, -0.35)],
    ]);
    ctx.fillRect(neck.x, neck.y, neck.width, neck.height);
    ctx.fillStyle = vertical(ctx, neck, [
      [0, "rgba(0,0,0,0.45)"],
      [0.15, "rgba(0,0,0,0)"],
      [0.9, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.25)"],
    ]);
    ctx.fillRect(neck.x, neck.y, neck.width, neck.height);
    // Foot: lit top edge and a darker front face.
    fillRR(
      ctx,
      foot,
      [4, 4, 10, 10],
      vertical(ctx, foot, [
        [0, shade(color.edge, 0.2)],
        [0.25, color.body],
        [1, shade(color.body, -0.35)],
      ]),
    );
  }
  metalShell(ctx, b, b.radius, color);
  const s = spec.screen;
  if (spec.ring) {
    // Coloured chin below a black glass panel.
    const r = spec.ring;
    frontGlass(
      ctx,
      {
        x: s.x - r,
        y: s.y - r,
        width: s.width + r * 2,
        height: s.height + r * 2,
      },
      10,
    );
  } else {
    frontGlass(ctx, inset(b, 5), shrink(b.radius, 5));
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
  const band = {
    x: b.x + (b.width - bandW) / 2,
    y: 0,
    width: bandW,
    height: spec.height,
  };
  const bandColor = color.band ?? color.body;
  // Strap: rounded edges in shadow, a soft highlight down the middle.
  fillRR(ctx, band, bandW * 0.3, bandColor);
  fillRR(
    ctx,
    band,
    bandW * 0.3,
    horizontal(ctx, band, [
      [0, "rgba(0,0,0,0.35)"],
      [0.1, "rgba(0,0,0,0.05)"],
      [0.45, "rgba(255,255,255,0.08)"],
      [0.9, "rgba(0,0,0,0.05)"],
      [1, "rgba(0,0,0,0.35)"],
    ]),
  );
  // The case shades the strap where they meet.
  for (const [y0, y1] of [
    [b.y - 40, b.y + 10],
    [b.y + b.height - 10, b.y + b.height + 40],
  ]) {
    const up = y0 < b.y;
    ctx.fillStyle = vertical(ctx, { x: 0, y: y0, width: 0, height: y1 - y0 }, [
      [0, up ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.4)"],
      [1, up ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)"],
    ]);
    ctx.fillRect(band.x, y0, band.width, y1 - y0);
  }
  // Digital crown with ridges, and the side button.
  const crown = {
    x: b.x + b.width - 6,
    y: b.y + b.height * 0.27,
    width: 20,
    height: 72,
  };
  button(ctx, crown, color, "right");
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = crown.y + 6; y < crown.y + crown.height - 4; y += 5)
    ctx.fillRect(crown.x + 8, y, 12, 1.4);
  button(
    ctx,
    { x: b.x + b.width - 5, y: b.y + b.height * 0.5, width: 13, height: 84 },
    color,
    "right",
  );

  metalShell(ctx, b, b.radius, color);
  frontGlass(ctx, inset(b, 6), shrink(b.radius, 6));
  screenFn();
  // Domed glass catches a curved highlight along its top edge.
  ctx.save();
  rr(ctx, inset(b, 6), shrink(b.radius, 6));
  ctx.clip();
  const dome = inset(b, 6);
  ctx.fillStyle = vertical(ctx, dome, [
    [0, "rgba(255,255,255,0.16)"],
    [0.08, "rgba(255,255,255,0)"],
  ]);
  ctx.fillRect(dome.x, dome.y, dome.width, dome.height * 0.1);
  ctx.restore();
}

/** Window controls: three softly shaded dots in the usual close / minimise / zoom colours. */
function windowDots(ctx: Ctx, y: number) {
  const fills = ["#f2615a", "#f4bf4f", "#4dc45a"];
  fills.forEach((c, i) => {
    const x = 26 + i * 22;
    dot(ctx, x, y, 6.5, c);
    ctx.beginPath();
    ctx.arc(x, y, 6.1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
}

function drawWindow(
  ctx: Ctx,
  spec: DeviceSpec,
  color: DeviceColor,
  screenFn: () => void,
) {
  const b = spec.body;
  const face = color.face ?? color.body;
  const dark = luminance(color.body) < 0.4;
  fillRR(ctx, b, b.radius, dark ? "#0b0b0d" : "#b8b6b1");
  const inner = inset(b, 1);
  const bar = {
    x: inner.x,
    y: inner.y,
    width: inner.width,
    height: spec.screen.y,
  };
  fillRR(ctx, inner, shrink(b.radius, 1), color.body);
  if (bar.height > 0) {
    // Title bar: a gentle top-lit gradient and a separating hairline.
    fillRR(
      ctx,
      bar,
      [b.radius as number, b.radius as number, 0, 0],
      vertical(ctx, bar, [
        [0, shade(color.body, dark ? 0.06 : 0.04)],
        [1, color.body],
      ]),
    );
    ctx.fillStyle = dark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(inner.x, spec.screen.y - 1, inner.width, 1);
  }
  // Hairline highlight along the top edge of the window.
  strokeRR(
    ctx,
    inset(b, 1.5),
    shrink(b.radius, 1.5),
    vertical(ctx, b, [
      [0, dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.9)"],
      [0.06, "rgba(255,255,255,0)"],
    ]),
    1,
  );

  const w = b.width;
  const field = dark ? "#1a1a1e" : "#ffffff";
  const fieldStroke = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)";
  switch (spec.chrome) {
    case "browser": {
      windowDots(ctx, 26);
      const url = { x: w / 2 - 260, y: 11, width: 520, height: 30 };
      fillRR(ctx, url, 9, field);
      strokeRR(ctx, url, 9, fieldStroke, 1);
      fillRR(
        ctx,
        { x: url.x + 14, y: url.y + 11, width: 8, height: 8 },
        2,
        rgba(color.edge, 0.9),
      );
      fillRR(
        ctx,
        { x: url.x + url.width / 2 - 70, y: url.y + 11, width: 140, height: 8 },
        4,
        dark ? "#3a3a41" : "#d8d6d1",
      );
      break;
    }
    case "tabs": {
      windowDots(ctx, 22);
      const tab = { x: 96, y: 8, width: 240, height: 36 };
      fillRR(ctx, tab, [10, 10, 0, 0], face);
      fillRR(
        ctx,
        { x: 116, y: 22, width: 120, height: 8 },
        4,
        dark ? "#4a4a52" : "#c9c7c2",
      );
      fillRR(
        ctx,
        { x: 360, y: 22, width: 100, height: 8 },
        4,
        dark ? "#34343a" : "#d6d4cf",
      );
      ctx.fillStyle = face;
      ctx.fillRect(inner.x, 44, inner.width, 44);
      const url = { x: 120, y: 52, width: w - 240, height: 28 };
      fillRR(ctx, url, 8, field);
      strokeRR(ctx, url, 8, fieldStroke, 1);
      break;
    }
    case "app":
      windowDots(ctx, 20);
      fillRR(
        ctx,
        { x: w / 2 - 80, y: 14, width: 160, height: 12 },
        6,
        dark ? "#3a3a41" : "#d3d1cc",
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
  // Frosted edge: bright rim at the top fading down, plus a soft inner glow.
  strokeRR(
    ctx,
    inset(b, 1),
    shrink(b.radius, 1),
    vertical(ctx, b, [
      [0, "rgba(255,255,255,0.75)"],
      [0.5, color.edge],
      [1, "rgba(255,255,255,0.3)"],
    ]),
    2,
  );
  fillRR(
    ctx,
    b,
    b.radius,
    vertical(ctx, b, [
      [0, "rgba(255,255,255,0.2)"],
      [0.45, "rgba(255,255,255,0.03)"],
      [1, "rgba(255,255,255,0)"],
    ]),
  );
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
  const screenFn = (useGlare = glare, bezelShadow = true) =>
    drawScreen(
      ctx,
      geo.screen,
      geo.screen.radius,
      image,
      crop,
      useGlare,
      bezelShadow,
    );
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
      return drawWindow(ctx, spec, color, () => screenFn(false, false));
    case "glass":
      return drawGlass(ctx, spec, color, () => screenFn(false, false));
    case "frameless":
      return screenFn(false, false);
    case "custom":
      screenFn(false, false);
      if (spec.frame) ctx.drawImage(spec.frame, 0, 0, spec.width, spec.height);
      return;
  }
}

/** Whether the glare switch does anything on this device. */
export function hasGlass(spec: DeviceSpec) {
  return ["handheld", "laptop", "desktop", "watch"].includes(spec.style);
}
