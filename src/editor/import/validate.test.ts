import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  downscaleSize,
  pickFile,
  validateFile,
} from "./validate";

describe("validateFile", () => {
  it("accepts PNG, JPG and WebP", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(validateFile({ type, size: 1000 })).toEqual({ ok: true });
    }
  });

  it("rejects other types with a clear message", () => {
    expect(validateFile({ type: "image/gif", size: 10 })).toMatchObject({
      ok: false,
      message: "Mockform supports PNG, JPG and WebP images.",
    });
    expect(validateFile({ type: "video/mp4", size: 10 })).toMatchObject({
      ok: false,
    });
  });

  it("rejects files over 50 MB", () => {
    const r = validateFile({
      type: "image/png",
      size: MAX_FILE_BYTES + 5 * 1024 * 1024,
    });
    expect(r).toEqual({
      ok: false,
      message: "That file is 55 MB. The limit is 50 MB.",
    });
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
  it("prefers an image over other files", () => {
    const txt = new File(["x"], "a.txt", { type: "text/plain" });
    const png = new File(["x"], "b.png", { type: "image/png" });
    expect(pickFile([txt, png])).toBe(png);
    expect(pickFile([txt])).toBe(txt);
    expect(pickFile([])).toBeNull();
  });
});
