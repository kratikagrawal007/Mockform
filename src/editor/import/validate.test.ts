import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_VIDEO_BYTES,
  downscaleSize,
  pickFile,
  validateFile,
} from "./validate";

describe("validateFile", () => {
  it("accepts PNG, JPG and WebP as images", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(validateFile({ type, size: 1000 })).toEqual({
        ok: true,
        media: "image",
      });
    }
  });

  it("accepts MP4, WebM and MOV as videos", () => {
    for (const type of ["video/mp4", "video/webm", "video/quicktime"]) {
      expect(validateFile({ type, size: 1000 })).toEqual({
        ok: true,
        media: "video",
      });
    }
  });

  it("rejects other types with a clear message", () => {
    expect(validateFile({ type: "image/gif", size: 10 })).toMatchObject({
      ok: false,
      message: expect.stringContaining("PNG, JPG and WebP"),
    });
    expect(validateFile({ type: "video/x-msvideo", size: 10 })).toMatchObject({
      ok: false,
      message: "Mockform supports MP4, WebM and MOV videos.",
    });
  });

  it("applies separate size limits to images and videos", () => {
    expect(
      validateFile({
        type: "image/png",
        size: MAX_FILE_BYTES + 5 * 1024 * 1024,
      }),
    ).toEqual({
      ok: false,
      message: "That file is 55 MB. The limit is 50 MB for images.",
    });
    expect(
      validateFile({ type: "video/mp4", size: MAX_FILE_BYTES + 1 }),
    ).toMatchObject({ ok: true });
    expect(
      validateFile({ type: "video/mp4", size: MAX_VIDEO_BYTES + 1 }),
    ).toMatchObject({ ok: false });
  });
});

describe("downscaleSize", () => {
  it("leaves normal images alone", () => {
    expect(downscaleSize(1206, 2622)).toEqual({
      width: 1206,
      height: 2622,
      scaled: false,
    });
  });

  it("scales the longer side down to the limit", () => {
    expect(downscaleSize(4000, 16000, 8000)).toEqual({
      width: 2000,
      height: 8000,
      scaled: true,
    });
  });
});

describe("pickFile", () => {
  it("prefers an image or video over other files", () => {
    const txt = new File(["x"], "a.txt", { type: "text/plain" });
    const mp4 = new File(["x"], "b.mp4", { type: "video/mp4" });
    expect(pickFile([txt, mp4])).toBe(mp4);
    expect(pickFile([txt])).toBe(txt);
    expect(pickFile([])).toBeNull();
  });
});
