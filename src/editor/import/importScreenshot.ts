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
import { createMediaAsset } from "./media";
import { validateFile } from "./validate";

export { decodeImage } from "./media";

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
    const asset = await createMediaAsset(file, {
      id: newAssetId(kind === "screenshot" ? "shot" : "bg"),
      kind,
      name:
        file.name ||
        (check.media === "video" ? "Pasted video" : "Pasted image"),
      media: check.media,
    });
    useAssets.getState().add(asset);
    return asset;
  } catch {
    toast(
      check.media === "video"
        ? "Couldn't play that video. Try an MP4 (H.264) or WebM file."
        : "Couldn't read that image. It may be damaged.",
      "error",
    );
    return null;
  }
}

/**
 * Places screenshots on devices. A single file goes to the selected device;
 * several at once fill the layout's devices in order from the first. Never throws.
 */
export async function importScreenshots(
  files: ArrayLike<File>,
): Promise<boolean> {
  const list = Array.from(files);
  const images = list.filter(
    (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
  );
  const candidates = images.length ? images : list.slice(0, 1);
  if (!candidates.length) return false;

  const scene = getScene();
  // One file goes to the selected device; several fill the devices in order from Device 1.
  const start =
    candidates.length > 1
      ? 0
      : Math.max(
          0,
          scene.devices.indexOf(
            selectedDevice(scene, useUI.getState().selectedKey),
          ),
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
