import type { ImageAsset } from "@/editor/store/editor";
import { toast } from "@/editor/toasts";
import { downscaleSize } from "./validate";

export async function decodeImage(
  blob: Blob,
  announce = true,
): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  });
  const target = downscaleSize(bitmap.width, bitmap.height);
  if (!target.scaled) return bitmap;
  const resized = await createImageBitmap(bitmap, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: "high",
  });
  bitmap.close();
  if (announce)
    toast(`Large image scaled down to ${target.width} × ${target.height}.`);
  return resized;
}

function once(el: HTMLMediaElement, event: string, timeoutMs = 10_000) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(el.error ?? new Error("Video failed to load"));
    };
    const cleanup = () => {
      clearTimeout(t);
      el.removeEventListener(event, ok);
      el.removeEventListener("error", fail);
    };
    el.addEventListener(event, ok);
    el.addEventListener("error", fail);
  });
}

/** Seeks a video and resolves once the frame at that time is ready to draw. */
export async function seekVideo(video: HTMLVideoElement, time: number) {
  const t = Math.max(0, Math.min(time, (video.duration || 0) - 0.001));
  if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= 2) return;
  const done = once(video, "seeked", 5000);
  video.currentTime = t;
  await done;
}

/**
 * Loads a video into a muted, looping <video> element that canvases can draw.
 * Recordings from MediaRecorder often report an infinite duration until the
 * browser has seen the end, so that case is resolved by seeking far ahead.
 */
export async function loadVideo(blob: Blob) {
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  const ready = once(video, "loadeddata");
  video.src = URL.createObjectURL(blob);
  await ready;
  if (!Number.isFinite(video.duration)) {
    const known = once(video, "durationchange", 5000).catch(() => undefined);
    video.currentTime = 1e101;
    await known;
    await seekVideo(video, 0);
  }
  if (!video.videoWidth || !video.videoHeight)
    throw new Error("Video has no picture");
  return video;
}

/** Turns a stored or freshly picked file into an asset the editor can draw. */
export async function createMediaAsset(
  blob: Blob,
  info: {
    id: string;
    kind: ImageAsset["kind"];
    name: string;
    media: "image" | "video";
  },
  announce = true,
): Promise<ImageAsset> {
  if (info.media === "video") {
    const video = await loadVideo(blob);
    return {
      ...info,
      width: video.videoWidth,
      height: video.videoHeight,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      source: video,
      blob,
      previewUrl: video.src,
    };
  }
  const bitmap = await decodeImage(blob, announce);
  return {
    ...info,
    width: bitmap.width,
    height: bitmap.height,
    source: bitmap,
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

/** Releases a media asset's memory. */
export function disposeAsset(a: ImageAsset) {
  if (a.source instanceof ImageBitmap) a.source.close();
  else {
    a.source.pause();
    a.source.removeAttribute("src");
    a.source.load();
  }
  URL.revokeObjectURL(a.previewUrl);
}
