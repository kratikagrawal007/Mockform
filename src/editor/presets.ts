import { applyLayout } from "@/editor/layouts";
import type { LayoutId, Scene, ShadowPreset } from "@/editor/scene/types";

export interface SocialPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

/** Common sizes for posting. Platform names describe the size only. */
export const SOCIAL_PRESETS: readonly SocialPreset[] = [
  { id: "ig-square", name: "Instagram post", width: 1080, height: 1080 },
  { id: "ig-portrait", name: "Instagram portrait", width: 1080, height: 1350 },
  { id: "ig-story", name: "Instagram story", width: 1080, height: 1920 },
  { id: "x-post", name: "X post", width: 1600, height: 900 },
  { id: "linkedin", name: "LinkedIn post", width: 1200, height: 627 },
  { id: "facebook", name: "Facebook post", width: 1200, height: 630 },
  { id: "og-image", name: "Link preview (OG)", width: 1200, height: 630 },
  { id: "dribbble", name: "Dribbble shot", width: 1600, height: 1200 },
  {
    id: "product-hunt",
    name: "Product Hunt gallery",
    width: 1270,
    height: 760,
  },
  { id: "app-store-69", name: "App Store 6.9″", width: 1290, height: 2796 },
  { id: "play-store", name: "Play Store phone", width: 1080, height: 1920 },
  { id: "youtube", name: "YouTube thumbnail", width: 1280, height: 720 },
  { id: "pinterest", name: "Pinterest pin", width: 1000, height: 1500 },
];

export function applySocialPreset(scene: Scene, p: SocialPreset): Scene {
  return {
    ...scene,
    canvas: {
      preset: "custom",
      custom: { width: p.width, height: p.height, label: p.name },
    },
  };
}

export interface ShowcasePreset {
  id: string;
  name: string;
  description: string;
  canvas: { width: number; height: number };
  layout: LayoutId;
  /** Device per slot, in the layout's slot order. */
  devices: { deviceId: string; colorId: string }[];
  background:
    { kind: "gradient"; gradientId: string } | { kind: "solid"; color: string };
  shadow: ShadowPreset;
}

export const SHOWCASE_PRESETS: readonly ShowcasePreset[] = [
  {
    id: "launch-day",
    name: "Launch day",
    description: "Three phones fanned out on Violet Dusk",
    canvas: { width: 1600, height: 1200 },
    layout: "fan",
    devices: [
      { deviceId: "phone-pro-63", colorId: "graphite" },
      { deviceId: "phone-pro-63", colorId: "graphite" },
      { deviceId: "phone-pro-63", colorId: "graphite" },
    ],
    background: { kind: "gradient", gradientId: "violet-dusk" },
    shadow: "strong",
  },
  {
    id: "desk-setup",
    name: "Desk setup",
    description: "Laptop and phone on Graphite",
    canvas: { width: 1920, height: 1080 },
    layout: "laptop-phone",
    devices: [
      { deviceId: "laptop-14", colorId: "space" },
      { deviceId: "phone-pro-63", colorId: "graphite" },
    ],
    background: { kind: "gradient", gradientId: "graphite" },
    shadow: "medium",
  },
  {
    id: "product-hero",
    name: "Product hero",
    description: "One phone on Peach Haze",
    canvas: { width: 1080, height: 1350 },
    layout: "solo",
    devices: [{ deviceId: "phone-pro-63", colorId: "sand" }],
    background: { kind: "gradient", gradientId: "peach-haze" },
    shadow: "soft",
  },
  {
    id: "tablet-spread",
    name: "Tablet spread",
    description: "Tablet and phone on Aurora",
    canvas: { width: 1600, height: 1200 },
    layout: "phone-tablet",
    devices: [
      { deviceId: "tablet-11", colorId: "space" },
      { deviceId: "phone-61", colorId: "midnight" },
    ],
    background: { kind: "gradient", gradientId: "aurora" },
    shadow: "medium",
  },
  {
    id: "web-launch",
    name: "Web launch",
    description: "Browser window on Ink Blue",
    canvas: { width: 1920, height: 1080 },
    layout: "solo",
    devices: [{ deviceId: "browser", colorId: "dark" }],
    background: { kind: "gradient", gradientId: "ink-blue" },
    shadow: "strong",
  },
];

/** Applies a showcase while keeping every screenshot the user has added. */
export function applyShowcase(scene: Scene, p: ShowcasePreset): Scene {
  const shots = scene.devices
    .map((d) => d.screenshotId)
    .filter((s): s is string => !!s);
  const laidOut = applyLayout(scene, p.layout);
  const devices = laidOut.devices.map((d, i) => {
    const want = p.devices[i];
    return {
      ...d,
      deviceId: want.deviceId,
      colorId: want.colorId,
      screenshotId: shots[i] ?? null,
    };
  });
  return {
    ...laidOut,
    devices,
    canvas: { preset: "custom", custom: { ...p.canvas, label: p.name } },
    background: { ...scene.background, ...p.background },
    shadow: p.shadow,
  };
}
