export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** Images with a longer side than this are scaled down on import. */
export const MAX_IMAGE_SIDE = 8192;

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateFile(file: {
  type: string;
  size: number;
}): ValidationResult {
  if (file.type.startsWith("video/")) {
    return {
      ok: false,
      message:
        "Video support is coming soon. Add a PNG, JPG or WebP image for now.",
    };
  }
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: "Mockform supports PNG, JPG and WebP images.",
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024);
    return { ok: false, message: `That file is ${mb} MB. The limit is 50 MB.` };
  }
  return { ok: true };
}

export function downscaleSize(
  width: number,
  height: number,
  max = MAX_IMAGE_SIDE,
): { width: number; height: number; scaled: boolean } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height, scaled: false };
  const s = max / long;
  return {
    width: Math.round(width * s),
    height: Math.round(height * s),
    scaled: true,
  };
}

/** First file that looks like something the user meant to import. */
export function pickFile(files: ArrayLike<File>): File | null {
  const list = Array.from(files);
  return list.find((f) => f.type.startsWith("image/")) ?? list[0] ?? null;
}
