import { describe, expect, it } from "vitest";
import { applyLayout } from "./layouts";
import { createDevice, createScene } from "./scene/defaults";

describe("applyLayout", () => {
  it("keeps the existing device and its screenshot, adding new ones for empty slots", () => {
    const scene = createScene();
    scene.devices[0] = {
      ...scene.devices[0],
      colorId: "sand",
      screenshotId: "a",
    };
    const fan = applyLayout(scene, "fan");

    expect(fan.layout).toBe("fan");
    expect(fan.devices).toHaveLength(3);
    expect(fan.devices[0].key).toBe(scene.devices[0].key);
    expect(fan.devices[0].screenshotId).toBe("a");
    // New devices copy the look of the existing one.
    expect(fan.devices[1]).toMatchObject({
      deviceId: "phone-pro-63",
      colorId: "sand",
      screenshotId: null,
    });
  });

  it("hands screenshots from removed devices to new slots", () => {
    let scene = applyLayout(createScene(), "duo");
    scene = {
      ...scene,
      devices: scene.devices.map((d, i) => ({
        ...d,
        screenshotId: `shot-${i}`,
      })),
    };
    const combo = applyLayout(scene, "laptop-phone");
    expect(combo.devices.map((d) => d.deviceId)).toEqual([
      "laptop-14",
      "phone-pro-63",
    ]);
    // The phone that kept its slot keeps shot-0; the new laptop takes the spare shot-1.
    expect(combo.devices[1].screenshotId).toBe("shot-0");
    expect(combo.devices[0].screenshotId).toBe("shot-1");
  });

  it("reuses a device of the right category", () => {
    const scene = {
      ...createScene(),
      devices: [createDevice("tablet-11"), createDevice("phone-61")],
    };
    const out = applyLayout(scene, "phone-tablet");
    expect(out.devices[0].key).toBe(scene.devices[0].key);
    expect(out.devices[1].key).toBe(scene.devices[1].key);
  });

  it("goes back to one device for Solo", () => {
    const out = applyLayout(applyLayout(createScene(), "fan"), "solo");
    expect(out.devices).toHaveLength(1);
    expect(out.devices[0]).toMatchObject({
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
    });
  });
});
