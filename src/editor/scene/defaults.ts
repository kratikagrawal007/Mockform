import { DEFAULT_GRADIENT_ID } from "@/editor/backgrounds";
import { getPreset } from "@/editor/canvas";
import { DEFAULT_DEVICE_ID, getDevice } from "@/editor/devices/catalog";
import type { Crop, DeviceInstance, Scene } from "./types";

export const MAX_DEVICES = 3;

export const DEFAULT_CROP: Crop = { zoom: 1, panX: 0, panY: -1 };

let keyCounter = 0;
export function newDeviceKey() {
  return `d${Date.now().toString(36)}${(keyCounter++).toString(36)}`;
}

export function createDevice(
  deviceId: string,
  patch: Partial<DeviceInstance> = {},
): DeviceInstance {
  const spec = getDevice(deviceId);
  return {
    key: newDeviceKey(),
    deviceId: spec.id,
    colorId: spec.colors[0].id,
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    glare: true,
    screenshotId: null,
    crop: { ...DEFAULT_CROP },
    ...patch,
  };
}

export function createScene(): Scene {
  const custom = getPreset("custom");
  return {
    version: 2,
    canvas: {
      preset: "portrait",
      custom: { width: custom.width, height: custom.height },
    },
    background: {
      kind: "gradient",
      color: "#0e0e10",
      gradientId: DEFAULT_GRADIENT_ID,
      matched: null,
      imageId: null,
    },
    layout: "solo",
    devices: [createDevice(DEFAULT_DEVICE_ID)],
    shadow: "medium",
  };
}
