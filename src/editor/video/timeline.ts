import type { Scene, Size } from "@/editor/scene/types";

export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_FPS = 30;
export const VIDEO_RESOLUTIONS = [480, 720, 1080] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

/** Ids of every asset the scene draws (screens first, then the background video). */
export function sceneMediaIds(scene: Scene): string[] {
  const ids = scene.devices
    .map((d) => d.screenshotId)
    .filter((id): id is string => !!id);
  if (scene.background.kind === "video" && scene.background.videoId)
    ids.push(scene.background.videoId);
  return ids;
}

/**
 * The playable range. The timeline is as long as the longest video; trim
 * values are clamped into it. `exportLength` is capped at 60 s.
 */
export function timelineRange(
  timeline: Scene["timeline"],
  durations: number[],
) {
  const full = Math.max(0, ...durations.filter((d) => Number.isFinite(d)));
  const start = Math.min(Math.max(0, timeline.start), full);
  const end = Math.max(start, Math.min(timeline.end ?? full, full));
  const length = end - start;
  return {
    full,
    start,
    end,
    length,
    exportLength: Math.min(length, MAX_VIDEO_SECONDS),
  };
}

/** Where a looping video should be at timeline time `t`. */
export function videoTimeAt(t: number, duration: number) {
  if (!(duration > 0)) return 0;
  return ((t % duration) + duration) % duration;
}

/** Output size for a video export: the shorter side matches the resolution, both sides even. */
export function videoSize(canvas: Size, resolution: VideoResolution): Size {
  const s = resolution / Math.min(canvas.width, canvas.height);
  const even = (v: number) => Math.max(2, Math.round((v * s) / 2) * 2);
  return { width: even(canvas.width), height: even(canvas.height) };
}

export function formatTime(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}
