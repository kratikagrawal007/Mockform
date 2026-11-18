import { renderScene } from "@/editor/render/renderScene";
import {
  getResolved,
  getScene,
  useUI,
  type ExportSettings,
} from "@/editor/store/editor";
import { toast } from "@/editor/toasts";
import {
  lockPlayback,
  play,
  sceneVideos,
  usePlayback,
} from "@/editor/video/playback";
import { exportFileName, exportSize } from "./limits";

/** Renders the scene offscreen at the requested size. No editor UI is ever included. */
export async function renderToBlob(
  settings: ExportSettings & { format: "png" | "jpeg" },
) {
  const scene = getScene();
  const resolved = getResolved();
  const size = exportSize(resolved.canvas, settings.scale);
  if (!size.ok) throw new Error(size.message);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't create an image.");

  const transparent = settings.format === "png" && settings.transparent;
  if (settings.format === "jpeg") {
    // JPG has no transparency; give "no background" a white base instead of black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
  }
  renderScene(ctx, { scene, resolved, pxScale: settings.scale, transparent });

  const type = settings.format === "png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      type,
      settings.format === "jpeg" ? settings.quality : undefined,
    ),
  );
  // Free the backing store straight away; large canvases hold a lot of memory.
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error("This browser couldn't encode the image.");
  return { blob, name: exportFileName(size, settings.format) };
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ---------- Video export progress (shown as a modal) ---------- */

let videoAbort: AbortController | null = null;

export function cancelVideoExport() {
  videoAbort?.abort();
}

async function downloadVideo(settings: ExportSettings) {
  if (videoAbort) return;
  videoAbort = new AbortController();
  const wasPlaying = usePlayback.getState().playing;
  useUI.getState().setVideoProgress(0);
  try {
    // The encoder is only downloaded when someone exports a video.
    const { exportVideo } = await import("./exportVideo");
    const { blob, name } = await exportVideo(
      settings.videoResolution,
      (p) => useUI.getState().setVideoProgress(p),
      videoAbort.signal,
    );
    saveBlob(blob, name);
    useUI.getState().markExported();
    toast(`Saved ${name}`);
  } catch (e) {
    if (e instanceof Error && e.name === "ExportCancelled")
      toast("Video export cancelled");
    else
      toast(e instanceof Error ? e.message : "Video export failed.", "error");
  } finally {
    videoAbort = null;
    useUI.getState().setVideoProgress(null);
    lockPlayback(false);
    if (wasPlaying) play();
  }
}

export async function downloadExport(
  settings = useUI.getState().exportSettings,
) {
  // "Video" only applies while the scene has a video; otherwise fall back to PNG.
  if (settings.format === "video" && sceneVideos().length)
    return downloadVideo(settings);
  const format = settings.format === "video" ? "png" : settings.format;
  try {
    const { blob, name } = await renderToBlob({ ...settings, format });
    saveBlob(blob, name);
    useUI.getState().markExported();
    toast(`Saved ${name}`);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Export failed.", "error");
  }
}

export function canCopyImage() {
  return (
    typeof window !== "undefined" &&
    "ClipboardItem" in window &&
    !!navigator.clipboard?.write
  );
}

/** Copies a PNG to the clipboard. Always PNG: it's the only image type browsers reliably accept. */
export async function copyExport(settings = useUI.getState().exportSettings) {
  if (!canCopyImage()) {
    toast("This browser can't copy images. Use Download instead.", "error");
    return;
  }
  try {
    // Passing a promise keeps Safari's user-gesture requirement happy.
    const blob = renderToBlob({ ...settings, format: "png" }).then(
      (r) => r.blob,
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    useUI.getState().markExported();
    toast("Copied to clipboard");
  } catch (e) {
    toast(
      e instanceof Error && e.message.startsWith("Too large")
        ? e.message
        : "Couldn't copy the image.",
      "error",
    );
  }
}
