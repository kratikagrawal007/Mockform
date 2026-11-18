import { describe, expect, it } from "vitest";
import { getDevice } from "./devices/catalog";
import {
  applyShowcase,
  applySocialPreset,
  SHOWCASE_PRESETS,
  SOCIAL_PRESETS,
} from "./presets";
import { getLayout } from "./layouts";
import { createScene } from "./scene/defaults";

describe("social presets", () => {
  it("has 13 presets with unique ids", () => {
    expect(SOCIAL_PRESETS).toHaveLength(13);
    expect(new Set(SOCIAL_PRESETS.map((p) => p.id)).size).toBe(13);
  });

  it("sets a labelled custom canvas", () => {
    const out = applySocialPreset(createScene(), SOCIAL_PRESETS[2]);
    expect(out.canvas).toEqual({
      preset: "custom",
      custom: { width: 1080, height: 1920, label: "Instagram story" },
    });
  });
});

describe("showcase presets", () => {
  it.each(SHOWCASE_PRESETS.map((p) => [p.name, p] as const))(
    "%s is consistent",
    (_, p) => {
      expect(p.devices).toHaveLength(getLayout(p.layout).slots.length);
      for (const d of p.devices) {
        const spec = getDevice(d.deviceId);
        expect(spec.id).toBe(d.deviceId);
        expect(spec.colors.some((c) => c.id === d.colorId)).toBe(true);
      }
    },
  );

  it("keeps the user's screenshots", () => {
    const scene = createScene();
    scene.devices[0].screenshotId = "mine";
    const out = applyShowcase(scene, SHOWCASE_PRESETS[0]);
    expect(out.devices).toHaveLength(3);
    expect(out.devices[0].screenshotId).toBe("mine");
    expect(out.background).toMatchObject({
      kind: "gradient",
      gradientId: "violet-dusk",
    });
    expect(out.shadow).toBe("strong");
  });
});
