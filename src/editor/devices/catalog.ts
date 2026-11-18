import type { Rect, Size } from "@/editor/scene/types";

export type DeviceCategory =
  | "phones"
  | "tablets"
  | "laptops"
  | "desktops"
  | "watch"
  | "windows"
  | "other"
  | "custom";

export type DeviceStyle =
  | "handheld"
  | "laptop"
  | "desktop"
  | "watch"
  | "window"
  | "glass"
  | "frameless"
  | "custom";

export type Radii = number | [number, number, number, number];
export type Camera = "island" | "punch" | "notch" | "dot" | "none";
export type WindowChrome = "browser" | "tabs" | "app" | "minimal";

export interface DeviceColor {
  id: string;
  name: string;
  /** Main frame colour. */
  body: string;
  /** Lighter rim / highlight. */
  edge: string;
  /** Front glass around the screen on classic devices; toolbar on windows. */
  face?: string;
  /** Watch strap. */
  band?: string;
}

export interface DeviceSpec {
  id: string;
  name: string;
  category: DeviceCategory;
  style: DeviceStyle;
  /** Frame bounds in frame units. */
  width: number;
  height: number;
  /** Main body: phone shell, laptop lid, display, watch case, window. */
  body: Rect & { radius: Radii };
  screen: Rect & { radius: Radii };
  /** Pixel resolution of the screen; a hint, and what the Original canvas targets. */
  nativeScreen: Size;
  colors: DeviceColor[];
  camera?: Camera;
  /** Black glass ring around the screen, in frame units. */
  ring?: number;
  /** Side buttons as [side, start, length], start/length as fractions of body height. */
  buttons?: ["left" | "right", number, number][];
  homeButton?: boolean;
  base?: Rect;
  stand?: { neck: Rect; foot: Rect };
  chrome?: WindowChrome;
  /** Custom frames only: the uploaded artwork, drawn over the screenshot. */
  frame?: CanvasImageSource;
}

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phones: "Phones",
  tablets: "Tablets",
  laptops: "Laptops",
  desktops: "Desktops",
  watch: "Watch",
  windows: "Windows",
  other: "Other",
  custom: "Your frames",
};

/* ---------- Colour sets ---------- */

const C = (
  id: string,
  name: string,
  body: string,
  edge: string,
  extra: Partial<DeviceColor> = {},
): DeviceColor => ({
  id,
  name,
  body,
  edge,
  ...extra,
});

const PRO_COLORS = [
  C("graphite", "Black Titanium", "#3c3c3f", "#a3a3a8"),
  C("silver", "Natural Titanium", "#bdb9b2", "#f3f1ec"),
  C("sand", "Desert Titanium", "#bfa98d", "#efe2cf"),
  C("dusk", "Blue Titanium", "#3e4656", "#9aa4b8"),
];
const POP_COLORS = [
  C("midnight", "Midnight", "#22262f", "#6b7386"),
  C("mint", "Mint", "#a7d6c2", "#e6f6ee"),
  C("coral", "Coral", "#ec8c77", "#fbd2c6"),
  C("cloud", "Cloud", "#e6e4df", "#ffffff"),
];
const METAL_COLORS = [
  C("space", "Space Grey", "#4a4b50", "#a4a6ad"),
  C("silver", "Silver", "#d4d5d9", "#fbfbfc"),
  C("midnight", "Midnight", "#262a3b", "#6e7591"),
];
const CLASSIC_COLORS = [
  C("space", "Space", "#3b3b3f", "#6a6a6f", { face: "#0b0b0c" }),
  C("silver", "Silver", "#d5d6d9", "#f2f2f3", { face: "#fbfbfb" }),
  C("gold", "Gold", "#e3c9a8", "#f3e4cf", { face: "#fbfaf7" }),
];
const WINDOW_COLORS = [
  C("light", "Light", "#f2f1ee", "#dddbd6", { face: "#fbfaf8" }),
  C("dark", "Dark", "#232327", "#3a3a41", { face: "#2c2c31" }),
];

/* ---------- Builders ---------- */

const PHONE_BUTTONS: DeviceSpec["buttons"] = [
  ["left", 0.21, 0.04],
  ["left", 0.28, 0.07],
  ["left", 0.37, 0.07],
  ["right", 0.31, 0.11],
];

function handheld(o: {
  id: string;
  name: string;
  category: "phones" | "tablets";
  screen: Size;
  native: Size;
  bezel: number;
  radius: number;
  camera: Camera;
  colors: DeviceColor[];
  buttons?: DeviceSpec["buttons"];
}): DeviceSpec {
  const pad = o.buttons?.length ? 4 : 0;
  const body = {
    x: pad,
    y: 0,
    width: o.screen.width + o.bezel * 2,
    height: o.screen.height + o.bezel * 2,
  };
  return {
    id: o.id,
    name: o.name,
    category: o.category,
    style: "handheld",
    width: body.width + pad * 2,
    height: body.height,
    body: { ...body, radius: o.radius },
    screen: {
      x: pad + o.bezel,
      y: o.bezel,
      ...o.screen,
      radius: Math.max(0, o.radius - o.bezel),
    },
    nativeScreen: o.native,
    colors: o.colors,
    camera: o.camera,
    ring: 5,
    buttons: o.buttons,
  };
}

/** Older design: tall bezels with a home button and a coloured front. */
function classic(o: {
  id: string;
  name: string;
  category: "phones" | "tablets";
  screen: Size;
  native: Size;
  side: number;
  ends: number;
  radius: number;
}): DeviceSpec {
  const pad = o.category === "phones" ? 4 : 0;
  const body = {
    x: pad,
    y: 0,
    width: o.screen.width + o.side * 2,
    height: o.screen.height + o.ends * 2,
  };
  return {
    id: o.id,
    name: o.name,
    category: o.category,
    style: "handheld",
    width: body.width + pad * 2,
    height: body.height,
    body: { ...body, radius: o.radius },
    screen: { x: pad + o.side, y: o.ends, ...o.screen, radius: 0 },
    nativeScreen: o.native,
    colors: CLASSIC_COLORS,
    camera: "none",
    ring: 2,
    homeButton: true,
    buttons: pad ? PHONE_BUTTONS : undefined,
  };
}

function laptop(o: {
  id: string;
  name: string;
  screen: Size;
  native: Size;
  side: number;
  top: number;
  chin: number;
  colors?: DeviceColor[];
}): DeviceSpec {
  const lidW = o.screen.width + o.side * 2;
  const lidH = o.screen.height + o.top + o.chin;
  const baseW = Math.round(lidW * 1.14);
  const baseH = Math.round(lidW * 0.022);
  const lidX = (baseW - lidW) / 2;
  return {
    id: o.id,
    name: o.name,
    category: "laptops",
    style: "laptop",
    width: baseW,
    height: lidH + baseH - 4,
    body: { x: lidX, y: 0, width: lidW, height: lidH, radius: [30, 30, 6, 6] },
    screen: { x: lidX + o.side, y: o.top, ...o.screen, radius: [10, 10, 0, 0] },
    base: { x: 0, y: lidH - 4, width: baseW, height: baseH },
    nativeScreen: o.native,
    colors: o.colors ?? METAL_COLORS,
    camera: "dot",
  };
}

function display(o: {
  id: string;
  name: string;
  screen: Size;
  native: Size;
  bezel: number;
  chin: number;
  ring: number;
  neck: Size;
  foot: Size;
  colors: DeviceColor[];
}): DeviceSpec {
  const bodyW = o.screen.width + o.bezel * 2;
  const bodyH = o.screen.height + o.bezel + o.chin;
  const width = Math.max(bodyW, o.foot.width);
  const bx = (width - bodyW) / 2;
  return {
    id: o.id,
    name: o.name,
    category: "desktops",
    style: "desktop",
    width,
    height: bodyH + o.neck.height + o.foot.height,
    body: { x: bx, y: 0, width: bodyW, height: bodyH, radius: 22 },
    screen: { x: bx + o.bezel, y: o.bezel, ...o.screen, radius: 4 },
    nativeScreen: o.native,
    colors: o.colors,
    ring: o.ring,
    camera: "dot",
    stand: {
      neck: {
        x: (width - o.neck.width) / 2,
        y: bodyH - 20,
        width: o.neck.width,
        height: o.neck.height + 20,
      },
      foot: {
        x: (width - o.foot.width) / 2,
        y: bodyH + o.neck.height,
        ...o.foot,
      },
    },
  };
}

function windowFrame(o: {
  id: string;
  name: string;
  chrome: WindowChrome;
  screen: Size;
  bar: number;
}): DeviceSpec {
  return {
    id: o.id,
    name: o.name,
    category: "windows",
    style: "window",
    width: o.screen.width,
    height: o.screen.height + o.bar,
    body: {
      x: 0,
      y: 0,
      width: o.screen.width,
      height: o.screen.height + o.bar,
      radius: 14,
    },
    screen: {
      x: 0,
      y: o.bar,
      ...o.screen,
      radius: o.bar ? [0, 0, 13, 13] : 13,
    },
    nativeScreen: { width: o.screen.width * 2, height: o.screen.height * 2 },
    colors: WINDOW_COLORS,
    chrome: o.chrome,
  };
}

/* ---------- Catalogue (all artwork drawn by Mockform; names are generic on purpose) ---------- */

export const DEVICES: readonly DeviceSpec[] = [
  // Phones
  handheld({
    id: "phone-pro-63",
    name: "Phone Pro 6.3″",
    category: "phones",
    screen: { width: 402, height: 874 },
    native: { width: 1206, height: 2622 },
    bezel: 14,
    radius: 70,
    camera: "island",
    colors: PRO_COLORS,
    buttons: PHONE_BUTTONS,
  }),
  handheld({
    id: "phone-pro-max-69",
    name: "Phone Pro Max 6.9″",
    category: "phones",
    screen: { width: 440, height: 956 },
    native: { width: 1320, height: 2868 },
    bezel: 14,
    radius: 74,
    camera: "island",
    colors: PRO_COLORS,
    buttons: PHONE_BUTTONS,
  }),
  handheld({
    id: "phone-61",
    name: "Phone 6.1″",
    category: "phones",
    screen: { width: 360, height: 800 },
    native: { width: 1080, height: 2400 },
    bezel: 12,
    radius: 52,
    camera: "punch",
    colors: POP_COLORS,
    buttons: [
      ["right", 0.24, 0.07],
      ["right", 0.35, 0.13],
    ],
  }),
  handheld({
    id: "phone-plus-67",
    name: "Phone Plus 6.7″",
    category: "phones",
    screen: { width: 412, height: 915 },
    native: { width: 1440, height: 3200 },
    bezel: 12,
    radius: 56,
    camera: "punch",
    colors: POP_COLORS,
    buttons: [
      ["right", 0.24, 0.07],
      ["right", 0.35, 0.13],
    ],
  }),
  handheld({
    id: "phone-notch-61",
    name: "Phone Notch 6.1″",
    category: "phones",
    screen: { width: 390, height: 844 },
    native: { width: 1170, height: 2532 },
    bezel: 16,
    radius: 62,
    camera: "notch",
    colors: PRO_COLORS,
    buttons: PHONE_BUTTONS,
  }),
  handheld({
    id: "phone-mini-54",
    name: "Phone Mini 5.4″",
    category: "phones",
    screen: { width: 360, height: 780 },
    native: { width: 1080, height: 2340 },
    bezel: 16,
    radius: 58,
    camera: "notch",
    colors: POP_COLORS,
    buttons: PHONE_BUTTONS,
  }),
  classic({
    id: "phone-classic-47",
    name: "Phone Classic 4.7″",
    category: "phones",
    screen: { width: 375, height: 667 },
    native: { width: 750, height: 1334 },
    side: 22,
    ends: 104,
    radius: 62,
  }),

  // Tablets
  handheld({
    id: "tablet-11",
    name: "Tablet 11″",
    category: "tablets",
    screen: { width: 834, height: 1194 },
    native: { width: 1668, height: 2388 },
    bezel: 26,
    radius: 52,
    camera: "dot",
    colors: [
      C("space", "Space", "#4a4b4f", "#6f7075"),
      C("silver", "Silver", "#d8d9dc", "#f1f2f3"),
      C("violet", "Violet", "#8e7ad6", "#b9abf0"),
    ],
  }),
  handheld({
    id: "tablet-11-landscape",
    name: "Tablet 11″ Landscape",
    category: "tablets",
    screen: { width: 1194, height: 834 },
    native: { width: 2388, height: 1668 },
    bezel: 26,
    radius: 52,
    camera: "dot",
    colors: [
      C("space", "Space", "#4a4b4f", "#6f7075"),
      C("silver", "Silver", "#d8d9dc", "#f1f2f3"),
      C("violet", "Violet", "#8e7ad6", "#b9abf0"),
    ],
  }),
  handheld({
    id: "tablet-13",
    name: "Tablet 13″",
    category: "tablets",
    screen: { width: 1032, height: 1376 },
    native: { width: 2064, height: 2752 },
    bezel: 28,
    radius: 54,
    camera: "dot",
    colors: METAL_COLORS,
  }),
  handheld({
    id: "tablet-mini-83",
    name: "Tablet Mini 8.3″",
    category: "tablets",
    screen: { width: 744, height: 1133 },
    native: { width: 1488, height: 2266 },
    bezel: 26,
    radius: 50,
    camera: "dot",
    colors: POP_COLORS,
  }),
  classic({
    id: "tablet-classic-102",
    name: "Tablet Classic 10.2″",
    category: "tablets",
    screen: { width: 810, height: 1080 },
    native: { width: 1620, height: 2160 },
    side: 44,
    ends: 96,
    radius: 56,
  }),

  // Laptops
  laptop({
    id: "laptop-14",
    name: "Laptop 14″",
    screen: { width: 1512, height: 982 },
    native: { width: 3024, height: 1964 },
    side: 22,
    top: 26,
    chin: 40,
  }),
  laptop({
    id: "laptop-16",
    name: "Laptop 16″",
    screen: { width: 1728, height: 1117 },
    native: { width: 3456, height: 2234 },
    side: 22,
    top: 26,
    chin: 42,
  }),
  laptop({
    id: "laptop-13",
    name: "Laptop 13″",
    screen: { width: 1470, height: 956 },
    native: { width: 2940, height: 1912 },
    side: 20,
    top: 24,
    chin: 36,
    colors: [
      C("midnight", "Midnight", "#24283a", "#4a5068"),
      C("starlight", "Starlight", "#e3dccf", "#f6f2ea"),
      C("sky", "Sky", "#b9cde0", "#e2edf7"),
    ],
  }),
  laptop({
    id: "laptop-15-classic",
    name: "Laptop 15″ Classic",
    screen: { width: 1440, height: 900 },
    native: { width: 2880, height: 1800 },
    side: 40,
    top: 46,
    chin: 70,
  }),

  // Desktops
  display({
    id: "display-27",
    name: "Display 27″",
    screen: { width: 1600, height: 900 },
    native: { width: 5120, height: 2880 },
    bezel: 24,
    chin: 24,
    ring: 0,
    neck: { width: 220, height: 300 },
    foot: { width: 560, height: 24 },
    colors: METAL_COLORS,
  }),
  display({
    id: "all-in-one-24",
    name: "All-in-one 24″",
    screen: { width: 1600, height: 900 },
    native: { width: 4480, height: 2520 },
    bezel: 30,
    chin: 170,
    ring: 22,
    neck: { width: 380, height: 230 },
    foot: { width: 420, height: 22 },
    colors: [
      C("blue", "Blue", "#7fa6d6", "#b9d0ec"),
      C("green", "Green", "#8fc4a3", "#c3e3cd"),
      C("silver", "Silver", "#d6d7da", "#f0f1f2"),
      C("purple", "Purple", "#b4a3dc", "#d8cdf2"),
    ],
  }),

  // Watch
  {
    id: "watch-45",
    name: "Watch 45mm",
    category: "watch",
    style: "watch",
    width: 432 + 14,
    height: 520 + 320,
    body: { x: 0, y: 160, width: 432, height: 520, radius: 110 },
    screen: { x: 18, y: 178, width: 396, height: 484, radius: 92 },
    nativeScreen: { width: 396, height: 484 },
    ring: 10,
    colors: [
      C("midnight", "Midnight", "#2a2e38", "#545a68", { band: "#1c2029" }),
      C("starlight", "Starlight", "#e6dfd2", "#f7f3ec", { band: "#d9d0c0" }),
      C("red", "Red", "#c9343e", "#e2737a", { band: "#a8242e" }),
      C("silver", "Silver", "#cfd1d5", "#f1f2f4", { band: "#8f97a6" }),
    ],
  },

  // Windows
  windowFrame({
    id: "browser",
    name: "Browser window",
    chrome: "browser",
    screen: { width: 1440, height: 900 },
    bar: 52,
  }),
  windowFrame({
    id: "browser-tabs",
    name: "Browser with tabs",
    chrome: "tabs",
    screen: { width: 1440, height: 900 },
    bar: 88,
  }),
  windowFrame({
    id: "app-window",
    name: "App window",
    chrome: "app",
    screen: { width: 1280, height: 800 },
    bar: 40,
  }),
  windowFrame({
    id: "minimal-window",
    name: "Minimal window",
    chrome: "minimal",
    screen: { width: 1440, height: 900 },
    bar: 0,
  }),

  // Other
  {
    id: "frameless",
    name: "Frameless",
    category: "other",
    style: "frameless",
    // Frameless takes the shape of the screenshot; these are the defaults with no screenshot.
    width: 402,
    height: 874,
    body: { x: 0, y: 0, width: 402, height: 874, radius: 24 },
    screen: { x: 0, y: 0, width: 402, height: 874, radius: 24 },
    nativeScreen: { width: 1206, height: 2622 },
    colors: [C("none", "No frame", "#000000", "#000000")],
  },
  {
    id: "glass-panel",
    name: "Spatial glass",
    category: "other",
    style: "glass",
    width: 1328,
    height: 768 + 48,
    body: { x: 0, y: 0, width: 1328, height: 768, radius: 58 },
    screen: { x: 24, y: 24, width: 1280, height: 720, radius: 36 },
    nativeScreen: { width: 2560, height: 1440 },
    colors: [
      C("clear", "Clear", "rgba(255,255,255,0.16)", "rgba(255,255,255,0.55)"),
      C("smoke", "Smoke", "rgba(20,20,26,0.38)", "rgba(255,255,255,0.28)"),
    ],
  },
];

export const DEFAULT_DEVICE_ID = DEVICES[0].id;

/* ---------- Custom frames (registered at runtime from the user's library) ---------- */

let customDevices: DeviceSpec[] = [];

export function setCustomDevices(specs: DeviceSpec[]) {
  customDevices = specs;
}

export function allDevices(): readonly DeviceSpec[] {
  return customDevices.length ? [...DEVICES, ...customDevices] : DEVICES;
}

export function getDevice(id: string): DeviceSpec {
  return (
    DEVICES.find((d) => d.id === id) ??
    customDevices.find((d) => d.id === id) ??
    DEVICES[0]
  );
}

export function getDeviceColor(spec: DeviceSpec, colorId: string): DeviceColor {
  return spec.colors.find((c) => c.id === colorId) ?? spec.colors[0];
}

export interface DeviceGeometry {
  width: number;
  height: number;
  screen: Rect & { radius: Radii };
  nativeScreen: Size;
}

const FRAMELESS_LONG_SIDE = 900;

/** Frame geometry for a device. Frameless adapts to the screenshot's shape. */
export function deviceGeometry(
  spec: DeviceSpec,
  image?: Size | null,
): DeviceGeometry {
  if (spec.style !== "frameless" || !image) {
    return {
      width: spec.width,
      height: spec.height,
      screen: spec.screen,
      nativeScreen: image
        ? { width: image.width, height: image.height }
        : spec.nativeScreen,
    };
  }
  const s = FRAMELESS_LONG_SIDE / Math.max(image.width, image.height);
  const width = image.width * s;
  const height = image.height * s;
  return {
    width,
    height,
    screen: {
      x: 0,
      y: 0,
      width,
      height,
      radius: Math.min(width, height) * 0.06,
    },
    nativeScreen: { width: image.width, height: image.height },
  };
}
