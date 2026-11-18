import { allDevices } from "@/editor/devices/catalog";
import { restoreFrames } from "@/editor/frames/frames";
import { createMediaAsset } from "@/editor/import/media";
import {
  useAssets,
  useEditor,
  useUI,
  type ExportSettings,
  type ImageAsset,
} from "@/editor/store/editor";
import { idbDelete, idbGetAll, idbPut } from "./idb";
import {
  parseScene,
  referencedImages,
  withoutMissingImages,
} from "./sceneSchema";

const SCENE_KEY = "mockform:scene";
const EXPORT_KEY = "mockform:export";

interface StoredAsset {
  id: string;
  kind: ImageAsset["kind"];
  /** Missing on assets saved before videos were supported. */
  media?: ImageAsset["media"];
  name: string;
  blob: Blob;
}

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: keep working without saving.
  }
}

/**
 * Restores the last session: custom frames first (scenes may use them), then
 * the scene, then only the images it still uses. Unused images are deleted.
 */
export async function restoreSession() {
  await restoreFrames();

  const exportSettings = readJSON(EXPORT_KEY);
  if (exportSettings && typeof exportSettings === "object") {
    const e = exportSettings as Partial<ExportSettings>;
    useUI.getState().setExportSettings({
      ...(e.format === "png" || e.format === "jpeg" || e.format === "video"
        ? { format: e.format }
        : {}),
      ...(e.videoResolution === 480 ||
      e.videoResolution === 720 ||
      e.videoResolution === 1080
        ? { videoResolution: e.videoResolution }
        : {}),
      ...(e.scale === 1 || e.scale === 2 || e.scale === 3
        ? { scale: e.scale }
        : {}),
      ...(typeof e.quality === "number" && e.quality >= 0.5 && e.quality <= 1
        ? { quality: e.quality }
        : {}),
      ...(typeof e.transparent === "boolean"
        ? { transparent: e.transparent }
        : {}),
    });
  }

  const known = new Set(allDevices().map((d) => d.id));
  const scene = parseScene(readJSON(SCENE_KEY), (id) => known.has(id));
  const stored = await idbGetAll<StoredAsset>("assets");
  const wanted = new Set(scene ? referencedImages(scene) : []);

  const restored: ImageAsset[] = [];
  await Promise.all(
    stored.map(async (s) => {
      if (!wanted.has(s.id)) return idbDelete("assets", s.id);
      try {
        restored.push(
          await createMediaAsset(
            s.blob,
            { id: s.id, kind: s.kind, name: s.name, media: s.media ?? "image" },
            false,
          ),
        );
      } catch {
        await idbDelete("assets", s.id);
      }
    }),
  );
  for (const a of restored) useAssets.getState().add(a);
  if (scene)
    useEditor
      .getState()
      .load(withoutMissingImages(scene, new Set(restored.map((a) => a.id))));
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves the scene (debounced), new images, and export settings as they change. */
export function startAutosave() {
  const unsubScene = useEditor.subscribe((s, prev) => {
    if (s.history.present === prev.history.present || s.gestureBase) return;
    clearTimeout(timer);
    timer = setTimeout(
      () => writeJSON(SCENE_KEY, useEditor.getState().history.present),
      400,
    );
  });
  const unsubAssets = useAssets.subscribe((s, prev) => {
    for (const a of Object.values(s.images)) {
      if (!prev.images[a.id])
        void idbPut<StoredAsset>("assets", {
          id: a.id,
          kind: a.kind,
          name: a.name,
          blob: a.blob,
        });
    }
  });
  const unsubUI = useUI.subscribe((s, prev) => {
    if (s.exportSettings !== prev.exportSettings)
      writeJSON(EXPORT_KEY, s.exportSettings);
  });
  return () => {
    unsubScene();
    unsubAssets();
    unsubUI();
    clearTimeout(timer);
  };
}
