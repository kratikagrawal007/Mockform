import { create } from "zustand";
import { getScene, useAssets, type ImageAsset } from "@/editor/store/editor";
import { sceneMediaIds, timelineRange, videoTimeAt } from "./timeline";

interface PlaybackStore {
  playing: boolean;
  /** Seconds since the start of the trimmed range. */
  time: number;
  /** While exporting, the exporter drives the videos and playback stays out of the way. */
  locked: boolean;
}

export const usePlayback = create<PlaybackStore>()(() => ({
  playing: false,
  time: 0,
  locked: false,
}));

/** Video assets the current scene shows. */
export function sceneVideos(): (ImageAsset & { source: HTMLVideoElement })[] {
  const images = useAssets.getState().images;
  return sceneMediaIds(getScene())
    .map((id) => images[id])
    .filter(
      (a): a is ImageAsset & { source: HTMLVideoElement } =>
        !!a && a.media === "video",
    );
}

export function currentRange() {
  return timelineRange(
    getScene().timeline,
    sceneVideos().map((v) => v.duration ?? 0),
  );
}

let raf = 0;
let startedAt = 0;

/** Keeps every video near the shared clock; small drift is left to native playback. */
function sync(time: number, hardSeek: boolean) {
  const { start } = currentRange();
  for (const v of sceneVideos()) {
    const target = videoTimeAt(start + time, v.source.duration);
    if (hardSeek || Math.abs(v.source.currentTime - target) > 0.25)
      v.source.currentTime = target;
  }
}

function tick(now: number) {
  const s = usePlayback.getState();
  if (!s.playing || s.locked) return;
  const { length } = currentRange();
  let time = (now - startedAt) / 1000;
  if (length > 0 && time >= length) {
    startedAt = now;
    time = 0;
    sync(0, true);
  } else {
    sync(time, false);
  }
  usePlayback.setState({ time });
  raf = requestAnimationFrame(tick);
}

export function play() {
  const videos = sceneVideos();
  if (!videos.length || usePlayback.getState().locked) return;
  const { length } = currentRange();
  const from =
    usePlayback.getState().time >= length ? 0 : usePlayback.getState().time;
  startedAt = performance.now() - from * 1000;
  sync(from, true);
  for (const v of videos) void v.source.play().catch(() => undefined);
  usePlayback.setState({ playing: true, time: from });
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

export function pause() {
  cancelAnimationFrame(raf);
  for (const v of sceneVideos()) v.source.pause();
  usePlayback.setState({ playing: false });
}

/** Jump to a time within the trimmed range (pauses playback). */
export function seek(time: number) {
  pause();
  const { length } = currentRange();
  const t = Math.min(Math.max(0, time), length);
  sync(t, true);
  usePlayback.setState({ time: t });
}

export function lockPlayback(locked: boolean) {
  if (locked) pause();
  usePlayback.setState({ locked });
}
