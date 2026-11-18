import { backgroundGradient } from "@/editor/backgrounds";
import { drawDevice, traceSilhouette } from "@/editor/devices/draw";
import type { Resolved, ResolvedDevice } from "@/editor/store/editor";
import type { BackgroundState, ShadowPreset, Size } from "@/editor/scene/types";
import { coverRect, placeDevice } from "./geometry";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Shadow sizes as a share of the device's height. */
const SHADOWS: Record<
  Exclude<ShadowPreset, "none">,
  { blur: number; y: number; alpha: number }
> = {
  soft: { blur: 0.04, y: 0.02, alpha: 0.28 },
  medium: { blur: 0.07, y: 0.04, alpha: 0.38 },
  strong: { blur: 0.11, y: 0.07, alpha: 0.5 },
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
  if (bg.kind === "image") {
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

function drawOne(
  ctx: Ctx,
  d: ResolvedDevice,
  canvas: Size,
  shadow: ShadowPreset,
  pxScale: number,
) {
  const { spec, geo, color, image, instance } = d;
  const place = placeDevice(geo, canvas, instance);
  ctx.save();
  ctx.translate(place.cx, place.cy);
  ctx.rotate(place.rotation);
  ctx.scale(place.scale, place.scale);
  ctx.translate(-geo.width / 2, -geo.height / 2);

  if (shadow !== "none") {
    // Canvas shadows ignore the transform, so convert frame units to output pixels.
    // The offset is applied straight down on the canvas regardless of device rotation.
    const k = pxScale * place.scale;
    const sh = SHADOWS[shadow];
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${sh.alpha})`;
    ctx.shadowBlur = sh.blur * geo.height * k;
    ctx.shadowOffsetY = sh.y * geo.height * k;
    if (spec.style === "custom" && spec.frame) {
      // Custom artwork: the shadow follows the image's own outline.
      ctx.drawImage(spec.frame, 0, 0, geo.width, geo.height);
    } else {
      traceSilhouette(ctx, spec, geo);
      ctx.fillStyle = "#000";
      ctx.fill();
    }
    ctx.restore();
  }

  drawDevice(
    ctx,
    spec,
    geo,
    color,
    image
      ? { source: image.bitmap, width: image.width, height: image.height }
      : null,
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
    drawBackground(
      ctx,
      scene.background,
      canvas,
      backgroundImage
        ? {
            source: backgroundImage.bitmap,
            width: backgroundImage.width,
            height: backgroundImage.height,
          }
        : null,
    );
  }
  for (const d of devices) drawOne(ctx, d, canvas, scene.shadow, pxScale);
  ctx.restore();
}
