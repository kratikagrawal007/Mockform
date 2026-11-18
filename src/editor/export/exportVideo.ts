import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import { seekVideo } from "@/editor/import/media";
import { renderScene } from "@/editor/render/renderScene";
import { getResolved, getScene } from "@/editor/store/editor";
import {
  currentRange,
  lockPlayback,
  sceneVideos,
} from "@/editor/video/playback";
import {
  VIDEO_FPS,
  videoSize,
  videoTimeAt,
  type VideoResolution,
} from "@/editor/video/timeline";

export class ExportCancelled extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelled";
  }
}

/**
 * Renders the trimmed timeline frame by frame (seeking every video to the exact
 * time first, so frames are never dropped or duplicated) and encodes it with
 * WebCodecs: MP4/H.264 where the browser can, otherwise WebM. Silent output.
 */
export async function exportVideo(
  resolution: VideoResolution,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<{ blob: Blob; name: string }> {
  const videos = sceneVideos();
  if (!videos.length)
    throw new Error("Add a video to a screen or the background first.");
  const range = currentRange();
  if (range.exportLength <= 0)
    throw new Error("The trimmed video is empty. Widen the trim range.");
  if (typeof VideoEncoder === "undefined") {
    throw new Error(
      "This browser can't encode video. Try a recent Chrome, Edge or Safari.",
    );
  }

  const scene = getScene();
  const resolved = getResolved();
  const size = videoSize(resolved.canvas, resolution);
  const mp4 = await getFirstEncodableVideoCodec(["avc"], size);
  const codec =
    mp4 ?? (await getFirstEncodableVideoCodec(["vp9", "vp8", "av1"], size));
  if (!codec)
    throw new Error(
      "This browser can't encode video at this size. Try a lower resolution.",
    );

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d")!;
  const output = new Output({
    format: mp4
      ? new Mp4OutputFormat({ fastStart: "in-memory" })
      : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec,
    quality: QUALITY_HIGH,
    // A keyframe every second keeps scrubbing smooth in players and editors.
    keyFrameInterval: 1,
  });
  output.addVideoTrack(source, { frameRate: VIDEO_FPS });

  lockPlayback(true);
  try {
    await output.start();
    const frames = Math.max(1, Math.round(range.exportLength * VIDEO_FPS));
    const pxScale = size.width / resolved.canvas.width;
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) {
        await output.cancel();
        throw new ExportCancelled();
      }
      const t = range.start + i / VIDEO_FPS;
      await Promise.all(
        videos.map((v) =>
          seekVideo(v.source, videoTimeAt(t, v.source.duration)),
        ),
      );
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Video has no transparency; "no background" becomes white, like JPG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
      renderScene(ctx, { scene, resolved, pxScale });
      await source.add(i / VIDEO_FPS, 1 / VIDEO_FPS);
      onProgress((i + 1) / frames);
    }
    await output.finalize();
  } finally {
    lockPlayback(false);
    canvas.width = canvas.height = 0;
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("The video couldn't be finished.");
  const ext = mp4 ? "mp4" : "webm";
  return {
    blob: new Blob([buffer], { type: mp4 ? "video/mp4" : "video/webm" }),
    name: `mockform-${size.width}x${size.height}.${ext}`,
  };
}
