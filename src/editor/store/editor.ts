import { create } from "zustand";
import { getPreset } from "@/editor/canvas";
import {
  deviceGeometry,
  getDevice,
  getDeviceColor,
  type DeviceColor,
  type DeviceGeometry,
  type DeviceSpec,
} from "@/editor/devices/catalog";
import { autoCanvasSize } from "@/editor/render/geometry";
import { createScene } from "@/editor/scene/defaults";
import {
  commit,
  createHistory,
  redo,
  undo,
  type History,
} from "@/editor/scene/history";
import type { DeviceInstance, Scene, Size } from "@/editor/scene/types";

/* ---------- Scene + undo history ---------- */

interface EditorStore {
  history: History<Scene>;
  /** Snapshot taken when a drag starts; the whole drag becomes one undo step. */
  gestureBase: Scene | null;
  /** Apply a change. Edits sharing a key within a short window merge into one undo step. */
  update: (recipe: (scene: Scene) => Scene, key?: string) => void;
  beginGesture: () => void;
  /** Change the scene during a gesture without adding undo steps. */
  updateLive: (recipe: (scene: Scene) => Scene) => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  /** Replace everything (used when restoring a saved session). */
  load: (scene: Scene) => void;
}

export const useEditor = create<EditorStore>()((set) => ({
  history: createHistory(createScene()),
  gestureBase: null,
  update: (recipe, key) =>
    set((s) => ({
      history: commit(s.history, recipe(s.history.present), key),
    })),
  beginGesture: () => set((s) => ({ gestureBase: s.history.present })),
  updateLive: (recipe) =>
    set((s) => ({
      history: { ...s.history, present: recipe(s.history.present) },
    })),
  endGesture: () =>
    set((s) => {
      const base = s.gestureBase;
      if (!base || base === s.history.present) return { gestureBase: null };
      const present = s.history.present;
      return {
        gestureBase: null,
        history: commit({ ...s.history, present: base }, present),
      };
    }),
  undo: () => set((s) => ({ history: undo(s.history) })),
  redo: () => set((s) => ({ history: redo(s.history) })),
  load: (scene) => set({ history: createHistory(scene), gestureBase: null }),
}));

export function useScene<T>(select: (scene: Scene) => T): T {
  return useEditor((s) => select(s.history.present));
}

export const getScene = () => useEditor.getState().history.present;

/** Update one device by key. */
export function updateDevice(
  key: string,
  patch: Partial<DeviceInstance>,
  historyKey?: string,
) {
  useEditor.getState().update(
    (s) => ({
      ...s,
      devices: s.devices.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }),
    historyKey,
  );
}

/* ---------- Imported images (outside history; scenes refer to them by id) ---------- */

export interface ImageAsset {
  id: string;
  kind: "screenshot" | "background";
  media: "image" | "video";
  name: string;
  width: number;
  height: number;
  /** Video length in seconds (videos only). */
  duration?: number;
  /** What canvases draw: a decoded image, or a muted <video> element. */
  source: ImageBitmap | HTMLVideoElement;
  /** The original file, kept so the session can be saved and restored. */
  blob: Blob;
  /** Object URL of the original file, for thumbnails. */
  previewUrl: string;
}

interface AssetStore {
  images: Record<string, ImageAsset>;
  add: (asset: ImageAsset) => void;
}

export const useAssets = create<AssetStore>()((set) => ({
  images: {},
  add: (asset) => set((s) => ({ images: { ...s.images, [asset.id]: asset } })),
}));

export function useImage(id: string | null | undefined): ImageAsset | null {
  return useAssets((s) => (id ? (s.images[id] ?? null) : null));
}

/* ---------- Session UI state (not undoable) ---------- */

export type ExportFormat = "png" | "jpeg" | "video";

export interface ExportSettings {
  format: ExportFormat;
  scale: 1 | 2 | 3;
  /** JPG quality, 0.5–1. */
  quality: number;
  transparent: boolean;
  /** Shorter side of a video export, in pixels. */
  videoResolution: 480 | 720 | 1080;
}

export type DialogId = "shortcuts" | "about" | null;

interface UIStore {
  selectedKey: string | null;
  cropping: boolean;
  dialog: DialogId;
  exportSettings: ExportSettings;
  deviceTouched: boolean;
  exported: boolean;
  /** 0–1 while a video export runs, otherwise null. */
  videoProgress: number | null;
  setVideoProgress: (p: number | null) => void;
  select: (key: string | null) => void;
  setCropping: (on: boolean) => void;
  openDialog: (d: DialogId) => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;
  markDeviceTouched: () => void;
  markExported: () => void;
}

export const useUI = create<UIStore>()((set) => ({
  selectedKey: null,
  cropping: false,
  dialog: null,
  exportSettings: {
    format: "png",
    scale: 2,
    quality: 0.92,
    transparent: false,
    videoResolution: 1080,
  },
  deviceTouched: false,
  exported: false,
  videoProgress: null,
  setVideoProgress: (videoProgress) => set({ videoProgress }),
  select: (selectedKey) =>
    set((s) => ({
      selectedKey,
      cropping: selectedKey === s.selectedKey ? s.cropping : false,
    })),
  setCropping: (cropping) => set({ cropping }),
  openDialog: (dialog) => set({ dialog }),
  setExportSettings: (patch) =>
    set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),
  markDeviceTouched: () => set({ deviceTouched: true }),
  markExported: () => set({ exported: true }),
}));

/** The selected device, falling back to the first one if the selection is stale. */
export function selectedDevice(
  scene: Scene,
  key: string | null,
): DeviceInstance {
  return scene.devices.find((d) => d.key === key) ?? scene.devices[0];
}

export function useSelectedDevice(): DeviceInstance {
  const key = useUI((s) => s.selectedKey);
  return useScene((s) => selectedDevice(s, key));
}

/* ---------- Derived values ---------- */

export interface ResolvedDevice {
  instance: DeviceInstance;
  spec: DeviceSpec;
  color: DeviceColor;
  geo: DeviceGeometry;
  image: ImageAsset | null;
}

export interface Resolved {
  canvas: Size & { name: string };
  devices: ResolvedDevice[];
  backgroundImage: ImageAsset | null;
}

export function resolveScene(
  scene: Scene,
  images: Record<string, ImageAsset>,
): Resolved {
  const devices = scene.devices.map((instance) => {
    const spec = getDevice(instance.deviceId);
    const image = instance.screenshotId
      ? (images[instance.screenshotId] ?? null)
      : null;
    return {
      instance,
      spec,
      image,
      color: getDeviceColor(spec, instance.colorId),
      geo: deviceGeometry(spec, image),
    };
  });
  const preset = getPreset(scene.canvas.preset);
  const size =
    scene.canvas.preset === "auto"
      ? autoCanvasSize(devices[0].geo)
      : scene.canvas.preset === "custom"
        ? {
            width: scene.canvas.custom.width,
            height: scene.canvas.custom.height,
          }
        : { width: preset.width, height: preset.height };
  const name =
    scene.canvas.preset === "custom"
      ? (scene.canvas.custom.label ?? preset.name)
      : preset.name;
  const bg = scene.background;
  const bgId =
    bg.kind === "video" ? bg.videoId : bg.kind === "image" ? bg.imageId : null;
  return {
    canvas: { name, ...size },
    devices,
    backgroundImage: bgId ? (images[bgId] ?? null) : null,
  };
}

export function useResolved(): Resolved {
  const scene = useEditor((s) => s.history.present);
  const images = useAssets((s) => s.images);
  return resolveScene(scene, images);
}

export function getResolved(): Resolved {
  return resolveScene(getScene(), useAssets.getState().images);
}
