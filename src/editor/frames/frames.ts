import { create } from "zustand";
import { setCustomDevices, type DeviceSpec } from "@/editor/devices/catalog";
import { decodeImage, newAssetId } from "@/editor/import/importScreenshot";
import { idbDelete, idbGetAll, idbPut } from "@/editor/persist/idb";
import type { Rect } from "@/editor/scene/types";
import { toast } from "@/editor/toasts";
import { detectScreen } from "./detectScreen";

export const FRAME_TYPES = ["image/png", "image/webp"];
const FRAME_MAX_BYTES = 20 * 1024 * 1024;

interface StoredFrame {
  id: string;
  name: string;
  blob: Blob;
  width: number;
  height: number;
  screen: Rect & { radius: number };
}

export interface CustomFrame extends StoredFrame {
  bitmap: ImageBitmap;
  previewUrl: string;
}

interface FrameStore {
  frames: CustomFrame[];
}

export const useFrames = create<FrameStore>()(() => ({ frames: [] }));

function toSpec(f: CustomFrame): DeviceSpec {
  return {
    id: f.id,
    name: f.name,
    category: "custom",
    style: "custom",
    width: f.width,
    height: f.height,
    body: { x: 0, y: 0, width: f.width, height: f.height, radius: 0 },
    screen: f.screen,
    nativeScreen: { width: f.screen.width, height: f.screen.height },
    colors: [
      { id: "original", name: "Original", body: "#000000", edge: "#000000" },
    ],
    frame: f.bitmap,
  };
}

function setFrames(frames: CustomFrame[]) {
  setCustomDevices(frames.map(toSpec));
  useFrames.setState({ frames });
}

async function hydrate(stored: StoredFrame): Promise<CustomFrame> {
  const bitmap = await decodeImage(stored.blob, false);
  return {
    ...stored,
    width: bitmap.width,
    height: bitmap.height,
    bitmap,
    previewUrl: URL.createObjectURL(stored.blob),
  };
}

function readAlpha(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
  const alpha = new Uint8Array(bitmap.width * bitmap.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return alpha;
}

/** Adds a frame from a PNG/WebP with a transparent screen. Returns the new device id. */
export async function importFrame(file: File): Promise<string | null> {
  if (!FRAME_TYPES.includes(file.type)) {
    toast("Frames need transparency: use a PNG or WebP.", "error");
    return null;
  }
  if (file.size > FRAME_MAX_BYTES) {
    toast("That frame is over 20 MB.", "error");
    return null;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeImage(file, false);
  } catch {
    toast("Couldn't read that image. It may be damaged.", "error");
    return null;
  }
  const found = detectScreen(readAlpha(bitmap), bitmap.width, bitmap.height);
  if (!found.ok) {
    bitmap.close();
    toast(found.message, "error");
    return null;
  }
  const stored: StoredFrame = {
    id: newAssetId("frame"),
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "My frame",
    blob: file,
    width: bitmap.width,
    height: bitmap.height,
    screen: found.screen,
  };
  const frame: CustomFrame = {
    ...stored,
    bitmap,
    previewUrl: URL.createObjectURL(file),
  };
  setFrames([...useFrames.getState().frames, frame]);
  void idbPut("frames", stored);
  toast(`Added “${stored.name}” to Your frames`);
  return frame.id;
}

export function removeFrame(id: string) {
  const frames = useFrames.getState().frames;
  const gone = frames.find((f) => f.id === id);
  if (gone) URL.revokeObjectURL(gone.previewUrl);
  setFrames(frames.filter((f) => f.id !== id));
  void idbDelete("frames", id);
}

/** Loads the saved frame library. Must run before the scene is restored. */
export async function restoreFrames() {
  const stored = await idbGetAll<StoredFrame>("frames");
  const frames = (
    await Promise.all(
      stored.map((s) =>
        hydrate(s).catch(() => {
          void idbDelete("frames", s.id);
          return null;
        }),
      ),
    )
  ).filter((f): f is CustomFrame => !!f);
  setFrames(frames);
}
