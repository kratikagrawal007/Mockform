import { describe, expect, it } from "vitest";
import { getDevice } from "@/editor/devices/catalog";
import { createScene } from "@/editor/scene/defaults";
import {
  parseScene,
  referencedImages,
  withoutMissingImages,
} from "./sceneSchema";

const known = (id: string) => getDevice(id).id === id;

describe("parseScene", () => {
  it("round-trips a valid scene", () => {
    const scene = createScene();
    expect(parseScene(JSON.parse(JSON.stringify(scene)), known)).toEqual(scene);
  });

  it("rejects junk", () => {
    expect(parseScene(null, known)).toBeNull();
    expect(parseScene("hello", known)).toBeNull();
    expect(parseScene({ version: 99 }, known)).toBeNull();
    expect(parseScene({ ...createScene(), devices: [] }, known)).toBeNull();
  });

  it("clamps out-of-range values and drops unknown devices", () => {
    const scene = createScene();
    const raw = {
      ...scene,
      shadow: "huge",
      canvas: { preset: "nope", custom: { width: 999999, height: -5 } },
      devices: [
        {
          ...scene.devices[0],
          scale: 50,
          rotation: 720,
          crop: { zoom: 99, panX: 5, panY: -5 },
        },
        { deviceId: "not-a-device" },
      ],
    };
    const out = parseScene(raw, known)!;
    expect(out.shadow).toBe("medium");
    expect(out.canvas.preset).toBe("portrait");
    expect(out.canvas.custom).toEqual({ width: 16384, height: 64 });
    expect(out.devices).toHaveLength(1);
    expect(out.devices[0]).toMatchObject({
      scale: 3,
      rotation: 180,
      crop: { zoom: 4, panX: 1, panY: -1 },
    });
  });

  it("migrates a version 1 scene", () => {
    const v1 = {
      version: 1,
      canvas: { preset: "wide", custom: { width: 1600, height: 1200 } },
      background: { kind: "solid", color: "#ff7a59", gradientId: "aurora" },
      device: {
        deviceId: "tablet-11",
        colorId: "violet",
        scale: 0.8,
        offsetX: 0.1,
        offsetY: -0.2,
        glare: false,
      },
      shadow: "soft",
      screenshotId: "shot-1",
    };
    const out = parseScene(v1, known)!;
    expect(out.version).toBe(2);
    expect(out.layout).toBe("solo");
    expect(out.background).toMatchObject({
      kind: "solid",
      color: "#ff7a59",
      imageId: null,
    });
    expect(out.devices[0]).toMatchObject({
      deviceId: "tablet-11",
      colorId: "violet",
      scale: 0.8,
      glare: false,
      screenshotId: "shot-1",
    });
    expect(out.devices[0].x).toBeCloseTo(0.6);
    expect(out.devices[0].y).toBeCloseTo(0.3);
  });
});

describe("image references", () => {
  it("lists and prunes missing images", () => {
    const scene = createScene();
    scene.devices[0].screenshotId = "a";
    scene.background = { ...scene.background, kind: "image", imageId: "b" };
    expect(referencedImages(scene)).toEqual(["a", "b"]);
    const pruned = withoutMissingImages(scene, new Set(["a"]));
    expect(pruned.devices[0].screenshotId).toBe("a");
    expect(pruned.background).toMatchObject({
      imageId: null,
      kind: "gradient",
    });
  });
});
