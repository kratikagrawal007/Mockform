import type { BackgroundState, GradientDef } from "@/editor/scene/types";

export type GradientPreset = GradientDef;

export const MATCHED_GRADIENT_ID = "matched";

/** Mockform's signature mesh gradients. */
export const GRADIENTS: readonly GradientPreset[] = [
  {
    id: "violet-dusk",
    name: "Violet Dusk",
    base: "#1b1530",
    blobs: [
      { x: 0.2, y: 0.1, r: 0.65, color: "#8b6cff" },
      { x: 0.9, y: 1, r: 0.6, color: "#ff7a59" },
    ],
  },
  {
    id: "aurora",
    name: "Aurora",
    base: "#06231f",
    blobs: [
      { x: 0.15, y: 0.2, r: 0.6, color: "#2fd6a3" },
      { x: 0.85, y: 0.35, r: 0.55, color: "#3a7bff" },
      { x: 0.5, y: 1, r: 0.6, color: "#0b3d5c" },
    ],
  },
  {
    id: "peach-haze",
    name: "Peach Haze",
    base: "#ffd9c2",
    blobs: [
      { x: 0.1, y: 0.9, r: 0.65, color: "#ff8a65" },
      { x: 0.9, y: 0.1, r: 0.6, color: "#ffe8a3" },
    ],
  },
  {
    id: "ink-blue",
    name: "Ink Blue",
    base: "#070b1a",
    blobs: [
      { x: 0.5, y: 1.1, r: 0.75, color: "#2a4bff" },
      { x: 0.5, y: 1.25, r: 0.45, color: "#9fb4ff" },
    ],
  },
  {
    id: "citrus",
    name: "Citrus",
    base: "#fff4b8",
    blobs: [
      { x: 0.1, y: 0.1, r: 0.6, color: "#ffb703" },
      { x: 0.9, y: 0.9, r: 0.65, color: "#8ae67a" },
    ],
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    base: "#f6d6e3",
    blobs: [
      { x: 0.2, y: 0.85, r: 0.6, color: "#e86a92" },
      { x: 0.85, y: 0.15, r: 0.6, color: "#c3b5ff" },
    ],
  },
  {
    id: "lagoon",
    name: "Lagoon",
    base: "#0e3b4a",
    blobs: [
      { x: 0.8, y: 0.2, r: 0.6, color: "#2fb8c9" },
      { x: 0.2, y: 0.9, r: 0.6, color: "#1d6fd6" },
    ],
  },
  {
    id: "graphite",
    name: "Graphite",
    base: "#141417",
    blobs: [{ x: 0.5, y: 0, r: 0.8, color: "#44444f" }],
  },
];

export const SOLID_SWATCHES: readonly { name: string; color: string }[] = [
  { name: "Ink", color: "#0e0e10" },
  { name: "White", color: "#ffffff" },
  { name: "Paper", color: "#f3efe8" },
  { name: "Violet", color: "#6d4aff" },
  { name: "Coral", color: "#ff7a59" },
  { name: "Jade", color: "#2fd6a3" },
  { name: "Cobalt", color: "#1d6fd6" },
  { name: "Butter", color: "#ffd166" },
];

export const DEFAULT_GRADIENT_ID = GRADIENTS[0].id;

export function getGradient(id: string): GradientPreset {
  return GRADIENTS.find((g) => g.id === id) ?? GRADIENTS[0];
}

/** The gradient a background shows, including one made by Match colors. */
export function backgroundGradient(bg: BackgroundState): GradientPreset {
  if (bg.gradientId === MATCHED_GRADIENT_ID && bg.matched) return bg.matched;
  return getGradient(bg.gradientId);
}

/** CSS version of a gradient, for swatches. */
export function gradientCss(g: GradientPreset): string {
  const layers = g.blobs.map(
    (b) =>
      `radial-gradient(circle at ${b.x * 100}% ${b.y * 100}%, ${b.color} 0%, ${b.color}00 ${b.r * 100}%)`,
  );
  return [...layers, g.base].join(", ");
}
