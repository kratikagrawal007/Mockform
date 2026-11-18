import { DEFAULT_CROP } from "@/editor/scene/defaults";
import {
  getScene,
  selectedDevice,
  useAssets,
  useEditor,
  useUI,
  type ImageAsset,
} from "@/editor/store/editor";
import { toast } from "@/editor/toasts";
import { downscaleSize, validateFile } from "./validate";

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

let counter = 0;
export function newAssetId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

/** Validates and decodes one file into an asset. Shows a message and returns null on failure. */
export async function loadImageAsset(
  file: File,
  kind: ImageAsset["kind"],
): Promise<ImageAsset | null> {
  const check = validateFile(file);
  if (!check.ok) {
    toast(check.message, "error");
    return null;
  }
  try {
    const bitmap = await decodeImage(file);
    const asset: ImageAsset = {
      id: newAssetId(kind === "screenshot" ? "shot" : "bg"),
      kind,
      name: file.name || "Pasted image",
      width: bitmap.width,
      height: bitmap.height,
      bitmap,
      blob: file,
      previewUrl: URL.createObjectURL(file),
    };
    useAssets.getState().add(asset);
    return asset;
  } catch {
    toast("Couldn't read that image. It may be damaged.", "error");
    return null;
  }
}

/**
 * Places screenshots on devices, starting with the selected one. Several files
 * at once fill the layout's devices in order. Never throws.
 */
export async function importScreenshots(
  files: ArrayLike<File>,
): Promise<boolean> {
  const list = Array.from(files);
  const images = list.filter((f) => f.type.startsWith("image/"));
  const candidates = images.length ? images : list.slice(0, 1);
  if (!candidates.length) return false;

  const scene = getScene();
  const start = Math.max(
    0,
    scene.devices.indexOf(selectedDevice(scene, useUI.getState().selectedKey)),
  );
  const usable = candidates.slice(0, scene.devices.length);
  if (candidates.length > usable.length) {
    toast(
      `This layout holds ${scene.devices.length} screenshot${scene.devices.length > 1 ? "s" : ""}; extra files were skipped.`,
    );
  }

  const assets = (
    await Promise.all(usable.map((f) => loadImageAsset(f, "screenshot")))
  ).filter((a): a is ImageAsset => !!a);
  if (!assets.length) return false;

  useEditor.getState().update((s) => {
    const devices = [...s.devices];
    assets.forEach((a, i) => {
      const idx = (start + i) % devices.length;
      devices[idx] = {
        ...devices[idx],
        screenshotId: a.id,
        crop: { ...DEFAULT_CROP },
      };
    });
    return { ...s, devices };
  });
  return true;
}

/* A single hidden <input type="file"> lives in ImportController; anything can open it. */
type PickerKind = "screenshot" | "background" | "frame";
let pickers: Partial<Record<PickerKind, HTMLInputElement | null>> = {};

export function registerPicker(
  kind: PickerKind,
  input: HTMLInputElement | null,
) {
  pickers = { ...pickers, [kind]: input };
}

export function openPicker(kind: PickerKind = "screenshot") {
  pickers[kind]?.click();
}
