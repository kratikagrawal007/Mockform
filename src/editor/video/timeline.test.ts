import { describe, expect, it } from "vitest";
import { createScene } from "@/editor/scene/defaults";
import {
  formatTime,
  sceneMediaIds,
  timelineRange,
  videoSize,
  videoTimeAt,
} from "./timeline";

describe("timelineRange", () => {
  it("spans the longest video by default", () => {
    expect(timelineRange({ start: 0, end: null }, [4, 12.5])).toMatchObject({
      full: 12.5,
      start: 0,
      end: 12.5,
      length: 12.5,
      exportLength: 12.5,
    });
  });

  it("clamps trim values into the video", () => {
    expect(timelineRange({ start: 5, end: 99 }, [10])).toMatchObject({
      start: 5,
      end: 10,
      length: 5,
    });
    expect(timelineRange({ start: 8, end: 3 }, [10])).toMatchObject({
      start: 8,
      end: 8,
      length: 0,
    });
  });

  it("caps exports at 60 seconds", () => {
    expect(timelineRange({ start: 0, end: null }, [90]).exportLength).toBe(60);
  });

  it("is empty with no videos", () => {
    expect(timelineRange({ start: 0, end: null }, []).length).toBe(0);
  });
});

describe("videoTimeAt", () => {
  it("loops shorter videos", () => {
    expect(videoTimeAt(7, 3)).toBeCloseTo(1);
    expect(videoTimeAt(2, 0)).toBe(0);
  });
});

describe("videoSize", () => {
  it("sets the shorter side and keeps both sides even", () => {
    expect(videoSize({ width: 1080, height: 1350 }, 1080)).toEqual({
      width: 1080,
      height: 1350,
    });
    expect(videoSize({ width: 1920, height: 1080 }, 720)).toEqual({
      width: 1280,
      height: 720,
    });
    expect(videoSize({ width: 1001, height: 1500 }, 480)).toEqual({
      width: 480,
      height: 720,
    });
  });
});

describe("sceneMediaIds", () => {
  it("lists screen media and a background video", () => {
    const scene = createScene();
    scene.devices[0].screenshotId = "v1";
    scene.background = { ...scene.background, kind: "video", videoId: "bg" };
    expect(sceneMediaIds(scene)).toEqual(["v1", "bg"]);
  });
});

describe("formatTime", () => {
  it("shows minutes and tenths", () => {
    expect(formatTime(0)).toBe("0:00.0");
    expect(formatTime(72.35)).toBe("1:12.3");
  });
});
