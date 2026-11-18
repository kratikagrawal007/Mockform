import { GRADIENTS, MATCHED_GRADIENT_ID } from "@/editor/backgrounds";
import {
  CANVAS_MAX,
  CANVAS_MIN,
  CANVAS_PRESETS,
  type CanvasPresetId,
} from "@/editor/canvas";
import { LAYOUTS } from "@/editor/layouts";
import { MAX_ZOOM, clamp } from "@/editor/render/geometry";
import { PERSPECTIVES, type PerspectiveId } from "@/editor/render/perspective";
import {
  DEFAULT_CROP,
  MAX_DEVICES,
  createDevice,
  createScene,
} from "@/editor/scene/defaults";
import type {
  BackgroundKind,
  DeviceInstance,
  GradientDef,
  LayoutId,
  Scene,
  ShadowPreset,
} from "@/editor/scene/types";

/* Saved scenes are untrusted input (old versions, hand edits, corruption), so
   everything is checked and clamped, and anything unusable falls back to a default. */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : fallback;
const str = (v: unknown, fallback: string) =>
  typeof v === "string" && v.length < 200 ? v : fallback;
const oneOf = <T extends string>(
  v: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(v as T) ? (v as T) : fallback);
const color = (v: unknown, fallback: string) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
const idOrNull = (v: unknown) =>
  typeof v === "string" && v.length < 100 ? v : null;

function parseGradient(v: unknown): GradientDef | null {
  if (!isObj(v) || !Array.isArray(v.blobs)) return null;
  return {
    id: MATCHED_GRADIENT_ID,
    name: "Matched",
    base: color(v.base, "#1b1530"),
    blobs: v.blobs
      .slice(0, 4)
      .filter(isObj)
      .map((b) => ({
        x: num(b.x, 0.5, -1, 2),
        y: num(b.y, 0.5, -1, 2),
        r: num(b.r, 0.5, 0.05, 2),
        color: color(b.color, "#6d4aff"),
      })),
  };
}

function parseDevice(
  v: unknown,
  isKnownDevice: (id: string) => boolean,
): DeviceInstance | null {
  if (!isObj(v)) return null;
  const deviceId = str(v.deviceId, "");
  if (!isKnownDevice(deviceId)) return null;
  const base = createDevice(deviceId);
  const crop = isObj(v.crop) ? v.crop : {};
  return {
    ...base,
    key: str(v.key, base.key),
    colorId: str(v.colorId, base.colorId),
    x: num(v.x, 0.5, -1, 2),
    y: num(v.y, 0.5, -1, 2),
    scale: num(v.scale, 1, 0.1, 3),
    rotation: num(v.rotation, 0, -180, 180),
    glare: typeof v.glare === "boolean" ? v.glare : true,
    perspective: oneOf<PerspectiveId>(
      v.perspective,
      PERSPECTIVES.map((p) => p.id),
      "flat",
    ),
    screenshotId: idOrNull(v.screenshotId),
    crop: {
      zoom: num(crop.zoom, DEFAULT_CROP.zoom, 1, MAX_ZOOM),
      panX: num(crop.panX, DEFAULT_CROP.panX, -1, 1),
      panY: num(crop.panY, DEFAULT_CROP.panY, -1, 1),
    },
  };
}

/** Version 1 had a single device with offsets from the centre. */
function migrateV1(v: Obj): Obj {
  const d = isObj(v.device) ? v.device : {};
  const bg = isObj(v.background) ? v.background : {};
  return {
    ...v,
    version: 2,
    layout: "solo",
    background: { ...bg, matched: null, imageId: null, videoId: null },
    devices: [
      {
        deviceId: d.deviceId,
        colorId: d.colorId,
        x: 0.5 + num(d.offsetX, 0),
        y: 0.5 + num(d.offsetY, 0),
        scale: d.scale,
        rotation: 0,
        glare: d.glare,
        screenshotId: v.screenshotId,
      },
    ],
  };
}

export const SCENE_VERSION = 2;

export function parseScene(
  raw: unknown,
  isKnownDevice: (id: string) => boolean,
): Scene | null {
  if (!isObj(raw)) return null;
  let v = raw;
  if (v.version === 1) v = migrateV1(v);
  if (v.version !== SCENE_VERSION) return null;

  const def = createScene();
  const canvas = isObj(v.canvas) ? v.canvas : {};
  const custom = isObj(canvas.custom) ? canvas.custom : {};
  const bg = isObj(v.background) ? v.background : {};
  const timeline = isObj(v.timeline) ? v.timeline : {};
  const devices = (Array.isArray(v.devices) ? v.devices : [])
    .slice(0, MAX_DEVICES)
    .map((d) => parseDevice(d, isKnownDevice))
    .filter((d): d is DeviceInstance => !!d);
  if (!devices.length) return null;

  const gradientIds = [...GRADIENTS.map((g) => g.id), MATCHED_GRADIENT_ID];
  const matched = parseGradient(bg.matched);
  const label =
    typeof custom.label === "string" ? custom.label.slice(0, 60) : undefined;

  return {
    version: 2,
    canvas: {
      preset: oneOf<CanvasPresetId>(
        canvas.preset,
        CANVAS_PRESETS.map((p) => p.id),
        def.canvas.preset,
      ),
      custom: {
        width: Math.round(
          num(custom.width, def.canvas.custom.width, CANVAS_MIN, CANVAS_MAX),
        ),
        height: Math.round(
          num(custom.height, def.canvas.custom.height, CANVAS_MIN, CANVAS_MAX),
        ),
        ...(label ? { label } : {}),
      },
    },
    background: {
      kind: oneOf<BackgroundKind>(
        bg.kind,
        ["solid", "gradient", "image", "none"],
        def.background.kind,
      ),
      color: color(bg.color, def.background.color),
      gradientId:
        bg.gradientId === MATCHED_GRADIENT_ID && !matched
          ? def.background.gradientId
          : oneOf(bg.gradientId, gradientIds, def.background.gradientId),
      matched,
      imageId: idOrNull(bg.imageId),
      videoId: idOrNull(bg.videoId),
    },
    layout: oneOf<LayoutId>(
      v.layout,
      LAYOUTS.map((l) => l.id),
      "solo",
    ),
    devices,
    shadow: oneOf<ShadowPreset>(
      v.shadow,
      ["none", "soft", "medium", "strong"],
      def.shadow,
    ),
    timeline: {
      start: num(timeline.start, 0, 0, 36_000),
      end:
        timeline.end === null || timeline.end === undefined
          ? null
          : num(timeline.end, 0, 0, 36_000),
    },
  };
}

/** Every image id a scene points at. */
export function referencedImages(scene: Scene): string[] {
  const ids = scene.devices
    .map((d) => d.screenshotId)
    .filter((id): id is string => !!id);
  if (scene.background.imageId) ids.push(scene.background.imageId);
  return ids;
}

/** Drops references to images that couldn't be restored. */
export function withoutMissingImages(
  scene: Scene,
  available: Set<string>,
): Scene {
  return {
    ...scene,
    background: {
      ...scene.background,
      imageId:
        scene.background.imageId && available.has(scene.background.imageId)
          ? scene.background.imageId
          : null,
      kind:
        scene.background.kind === "image" &&
        !available.has(scene.background.imageId ?? "")
          ? "gradient"
          : scene.background.kind,
    },
    devices: scene.devices.map((d) =>
      d.screenshotId && !available.has(d.screenshotId)
        ? { ...d, screenshotId: null }
        : d,
    ),
  };
}
