import { backgroundGradient } from "@/editor/backgrounds";
import { drawDevice, traceSilhouette } from "@/editor/devices/draw";
import { castShadow } from "@/editor/devices/material";
import type {
  ImageAsset,
  Resolved,
  ResolvedDevice,
} from "@/editor/store/editor";
import type { BackgroundState, ShadowPreset, Size } from "@/editor/scene/types";
import { coverRect, placeDevice, type Placement } from "./geometry";
import { getPerspective, projectCorners } from "./perspective";
import { maxTextureSize, projectImage, webglAvailable } from "./webglProject";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Each shadow preset is two layers, sized as a share of the device's height:
 * a broad, faint ambient shadow and a tight, darker contact shadow where the
 * device meets the surface. Together they read as a real object on a table.
 */
const SHADOWS: Record<
  Exclude<ShadowPreset, "none">,
  { blur: number; y: number; alpha: number }[]
> = {
  soft: [
    { blur: 0.05, y: 0.022, alpha: 0.2 },
    { blur: 0.008, y: 0.004, alpha: 0.18 },
  ],
  medium: [
    { blur: 0.09, y: 0.045, alpha: 0.3 },
    { blur: 0.014, y: 0.008, alpha: 0.28 },
  ],
  strong: [
    { blur: 0.14, y: 0.08, alpha: 0.42 },
    { blur: 0.022, y: 0.014, alpha: 0.38 },
  ],
};

export function drawBackground(
  ctx: Ctx,
  bg: BackgroundState,
  canvas: Size,
  image: { source: CanvasImageSource; width: number; height: number } | null,
) {
  const { width, height } = canvas;
  if (bg.kind === "none") return;
  if (bg.kind === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (bg.kind === "image" || bg.kind === "video") {
    if (!image) {
      ctx.fillStyle = "#1a1a1d";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    const d = coverRect(
      image,
      { x: 0, y: 0, width, height },
      { zoom: 1, panX: 0, panY: 0 },
    );
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, d.x, d.y, d.width, d.height);
    return;
  }
  const g = backgroundGradient(bg);
  ctx.fillStyle = g.base;
  ctx.fillRect(0, 0, width, height);
  const long = Math.max(width, height);
  for (const b of g.blobs) {
    const cx = b.x * width;
    const cy = b.y * height;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r * long);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, `${b.color}00`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

/** Paints the shadow layers for a shape (never the shape itself). Sizes are in output pixels. */
function paintShadows(
  ctx: Ctx,
  shadow: ShadowPreset,
  deviceHeightPx: number,
  draw: () => void,
) {
  if (shadow === "none") return;
  for (const layer of SHADOWS[shadow]) {
    castShadow(ctx, draw, {
      blur: layer.blur * deviceHeightPx,
      // The offset points straight down on the canvas regardless of device rotation.
      offsetY: layer.y * deviceHeightPx,
      color: `rgba(0,0,0,${layer.alpha})`,
    });
  }
}

function screenImage(image: ImageAsset | null) {
  return image
    ? { source: image.source, width: image.width, height: image.height }
    : null;
}

let flatCanvas: HTMLCanvasElement | null = null;

/**
 * Tilted devices: draw the device flat into an offscreen canvas at output
 * resolution, project it with WebGL, then composite it. Returns false when
 * WebGL2 isn't available so the caller draws the device flat instead.
 */
function drawTilted(
  ctx: Ctx,
  d: ResolvedDevice,
  place: Placement,
  shadow: ShadowPreset,
  pxScale: number,
) {
  const persp = getPerspective(d.instance.perspective);
  if (
    persp.id === "flat" ||
    typeof document === "undefined" ||
    !webglAvailable()
  )
    return false;
  const { spec, geo, color, image, instance } = d;
  const k = pxScale * place.scale; // output pixels per frame unit
  const flatK = Math.min(k, maxTextureSize() / Math.max(geo.width, geo.height));
  flatCanvas ??= document.createElement("canvas");
  flatCanvas.width = Math.max(1, Math.ceil(geo.width * flatK));
  flatCanvas.height = Math.max(1, Math.ceil(geo.height * flatK));
  const fctx = flatCanvas.getContext("2d");
  if (!fctx) return false;
  fctx.setTransform(flatK, 0, 0, flatK, 0, 0);
  drawDevice(
    fctx,
    spec,
    geo,
    color,
    screenImage(image),
    instance.glare,
    instance.crop,
  );

  const out = projectImage(
    flatCanvas,
    projectCorners(geo.width * k, geo.height * k, persp),
  );
  if (!out) return false;
  ctx.save();
  ctx.translate(place.cx, place.cy);
  ctx.rotate(place.rotation);
  const drawProjected = () =>
    ctx.drawImage(
      out.canvas,
      out.x / pxScale,
      out.y / pxScale,
      out.width / pxScale,
      out.height / pxScale,
    );
  ctx.imageSmoothingQuality = "high";
  // The shadow follows the tilted device's own outline.
  paintShadows(ctx, shadow, geo.height * k, drawProjected);
  drawProjected();
  ctx.restore();
  return true;
}

function drawOne(
  ctx: Ctx,
  d: ResolvedDevice,
  canvas: Size,
  shadow: ShadowPreset,
  pxScale: number,
) {
  const { spec, geo, color, image, instance } = d;
  const place = placeDevice(geo, canvas, instance);
  if (drawTilted(ctx, d, place, shadow, pxScale)) return;

  ctx.save();
  ctx.translate(place.cx, place.cy);
  ctx.rotate(place.rotation);
  ctx.scale(place.scale, place.scale);
  ctx.translate(-geo.width / 2, -geo.height / 2);

  paintShadows(ctx, shadow, geo.height * pxScale * place.scale, () => {
    if (spec.style === "custom" && spec.frame) {
      // Custom artwork: the shadow follows the image's own outline.
      ctx.drawImage(spec.frame, 0, 0, geo.width, geo.height);
    } else {
      traceSilhouette(ctx, spec, geo);
      ctx.fillStyle = "#000";
      ctx.fill();
    }
  });

  drawDevice(
    ctx,
    spec,
    geo,
    color,
    screenImage(image),
    instance.glare,
    instance.crop,
  );
  ctx.restore();
}

export interface RenderOptions {
  scene: { background: BackgroundState; shadow: ShadowPreset };
  resolved: Resolved;
  /** Output pixels per canvas pixel (display fit × devicePixelRatio, or the export scale). */
  pxScale: number;
  /** Skip the background entirely (transparent PNG). */
  transparent?: boolean;
}

/** Draws the whole composition. Shared by the editor stage and the exporter. */
export function renderScene(
  ctx: Ctx,
  { scene, resolved, pxScale, transparent }: RenderOptions,
) {
  const { canvas, devices, backgroundImage } = resolved;
  ctx.save();
  ctx.scale(pxScale, pxScale);
  if (!transparent) {
    drawBackground(ctx, scene.background, canvas, screenImage(backgroundImage));
  }
  for (const d of devices) drawOne(ctx, d, canvas, scene.shadow, pxScale);
  ctx.restore();
}
