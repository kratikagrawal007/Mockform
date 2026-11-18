import { matchGradient } from "@/editor/color/matchColors";
import { getDevice } from "@/editor/devices/catalog";
import { applyLayout } from "@/editor/layouts";
import {
  applyShowcase,
  applySocialPreset,
  type ShowcasePreset,
  type SocialPreset,
} from "@/editor/presets";
import { clamp } from "@/editor/render/geometry";
import type { LayoutId } from "@/editor/scene/types";
import {
  getResolved,
  getScene,
  selectedDevice,
  updateDevice,
  useAssets,
  useEditor,
  useUI,
} from "@/editor/store/editor";
import { toast } from "@/editor/toasts";

const selectedKey = () =>
  selectedDevice(getScene(), useUI.getState().selectedKey).key;

/** Switch the selected device's model, keeping its colour when the new one has it. */
export function selectDevice(deviceId: string) {
  const spec = getDevice(deviceId);
  const key = selectedKey();
  const current = getScene().devices.find((d) => d.key === key);
  updateDevice(key, {
    deviceId: spec.id,
    colorId: spec.colors.some((c) => c.id === current?.colorId)
      ? current!.colorId
      : spec.colors[0].id,
  });
  useUI.getState().markDeviceTouched();
}

export function setLayout(id: LayoutId) {
  useEditor.getState().update((s) => applyLayout(s, id));
  const scene = getScene();
  // Keep the selection if that device survived, otherwise select the front one.
  if (!scene.devices.some((d) => d.key === useUI.getState().selectedKey)) {
    useUI.getState().select(scene.devices[scene.devices.length - 1].key);
  }
  useUI.getState().markDeviceTouched();
}

export function applySocial(p: SocialPreset) {
  useEditor.getState().update((s) => applySocialPreset(s, p));
}

export function applyShowcaseScene(p: ShowcasePreset) {
  useEditor.getState().update((s) => applyShowcase(s, p));
  useUI.getState().select(getScene().devices[0].key);
  useUI.getState().markDeviceTouched();
}

/** Move the selected device by canvas pixels. Consecutive nudges merge into one undo step. */
export function nudgeSelected(dx: number, dy: number) {
  const { canvas } = getResolved();
  const d = selectedDevice(getScene(), useUI.getState().selectedKey);
  updateDevice(
    d.key,
    {
      x: clamp(d.x + dx / canvas.width, -0.5, 1.5),
      y: clamp(d.y + dy / canvas.height, -0.5, 1.5),
    },
    `nudge-${d.key}`,
  );
}

/** Builds a background gradient from the selected device's screenshot (or the first one). */
export function matchColors() {
  const scene = getScene();
  const images = useAssets.getState().images;
  const preferred = selectedDevice(
    scene,
    useUI.getState().selectedKey,
  ).screenshotId;
  const id =
    preferred ?? scene.devices.find((d) => d.screenshotId)?.screenshotId;
  const image = id ? images[id] : null;
  if (!image) {
    toast(
      "Add a screenshot first, then Match colors builds a background from it.",
    );
    return;
  }
  const matched = matchGradient(image.bitmap, image.width, image.height);
  useEditor.getState().update((s) => ({
    ...s,
    background: {
      ...s.background,
      kind: "gradient",
      gradientId: matched.id,
      matched,
    },
  }));
}
