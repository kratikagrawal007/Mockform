import { getDevice, type DeviceCategory } from "@/editor/devices/catalog";
import { createDevice } from "@/editor/scene/defaults";
import type { DeviceInstance, LayoutId, Scene } from "@/editor/scene/types";

interface Slot {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** When set, the slot only reuses a device of this category… */
  category?: DeviceCategory;
  /** …and otherwise adds this one. */
  fallback: string;
}

export interface LayoutDef {
  id: LayoutId;
  name: string;
  /** Slots in draw order: later ones sit on top. */
  slots: Slot[];
}

const PHONE = "phone-pro-63";

export const LAYOUTS: readonly LayoutDef[] = [
  {
    id: "solo",
    name: "Solo",
    slots: [{ x: 0.5, y: 0.5, scale: 1, rotation: 0, fallback: PHONE }],
  },
  {
    id: "duo",
    name: "Duo",
    slots: [
      { x: 0.3, y: 0.52, scale: 0.72, rotation: 0, fallback: PHONE },
      { x: 0.7, y: 0.48, scale: 0.72, rotation: 0, fallback: PHONE },
    ],
  },
  {
    id: "stack",
    name: "Stack",
    slots: [
      { x: 0.4, y: 0.45, scale: 0.8, rotation: -6, fallback: PHONE },
      { x: 0.6, y: 0.55, scale: 0.86, rotation: 6, fallback: PHONE },
    ],
  },
  {
    id: "fan",
    name: "Fan",
    slots: [
      { x: 0.27, y: 0.54, scale: 0.66, rotation: -12, fallback: PHONE },
      { x: 0.73, y: 0.54, scale: 0.66, rotation: 12, fallback: PHONE },
      { x: 0.5, y: 0.48, scale: 0.76, rotation: 0, fallback: PHONE },
    ],
  },
  {
    id: "laptop-phone",
    name: "Laptop + Phone",
    slots: [
      {
        x: 0.45,
        y: 0.5,
        scale: 0.95,
        rotation: 0,
        category: "laptops",
        fallback: "laptop-14",
      },
      {
        x: 0.8,
        y: 0.6,
        scale: 0.5,
        rotation: 0,
        category: "phones",
        fallback: PHONE,
      },
    ],
  },
  {
    id: "phone-tablet",
    name: "Phone + Tablet",
    slots: [
      {
        x: 0.42,
        y: 0.5,
        scale: 0.85,
        rotation: 0,
        category: "tablets",
        fallback: "tablet-11",
      },
      {
        x: 0.77,
        y: 0.58,
        scale: 0.56,
        rotation: 0,
        category: "phones",
        fallback: PHONE,
      },
    ],
  },
];

export function getLayout(id: LayoutId): LayoutDef {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Arranges the scene into a layout. Matching devices are reused (keeping their
 * colour and screenshot), missing ones are added, and screenshots from devices
 * that drop out are handed to the new ones so nothing the user added is lost.
 */
export function applyLayout(scene: Scene, id: LayoutId): Scene {
  const layout = getLayout(id);
  const pool = [...scene.devices];
  const take = (category?: DeviceCategory): DeviceInstance | undefined => {
    const i = pool.findIndex(
      (d) => !category || getDevice(d.deviceId).category === category,
    );
    return i === -1 ? undefined : pool.splice(i, 1)[0];
  };

  const placed: (DeviceInstance | null)[] = layout.slots.map(
    (slot) => take(slot.category) ?? null,
  );
  const spareShots = pool
    .map((d) => d.screenshotId)
    .filter((s): s is string => !!s);
  // Fill gaps with a copy of the first reused device's look when it fits the slot.
  const template = placed.find((d): d is DeviceInstance => !!d);

  const devices = layout.slots.map((slot, i) => {
    const pose = {
      x: slot.x,
      y: slot.y,
      scale: slot.scale,
      rotation: slot.rotation,
    };
    const existing = placed[i];
    if (existing) return { ...existing, ...pose };
    const reuseLook =
      template &&
      (!slot.category ||
        getDevice(template.deviceId).category === slot.category);
    return createDevice(reuseLook ? template.deviceId : slot.fallback, {
      ...pose,
      colorId: reuseLook ? template.colorId : undefined,
      glare: template?.glare ?? true,
      screenshotId: spareShots.shift() ?? null,
    });
  });

  // createDevice fills colorId from the spec when we passed undefined.
  for (const d of devices) {
    if (!d.colorId) d.colorId = getDevice(d.deviceId).colors[0].id;
  }
  return { ...scene, layout: id, devices };
}
