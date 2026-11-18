export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
export const ACCEPTED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES] as const;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** Images with a longer side than this are scaled down on import. */
export const MAX_IMAGE_SIDE = 8192;

export type ValidationResult =
  { ok: true; media: "image" | "video" } | { ok: false; message: string };

export function validateFile(file: {
  type: string;
  size: number;
}): ValidationResult {
  const isVideo = (VIDEO_TYPES as readonly string[]).includes(file.type);
  const isImage = (IMAGE_TYPES as readonly string[]).includes(file.type);
  if (!isVideo && !isImage) {
    return {
      ok: false,
      message: file.type.startsWith("video/")
        ? "Mockform supports MP4, WebM and MOV videos."
        : "Mockform supports PNG, JPG and WebP images, and MP4, WebM and MOV videos.",
    };
  }
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
  if (file.size > limit) {
    const mb = Math.round(file.size / 1024 / 1024);
    return {
      ok: false,
      message: `That file is ${mb} MB. The limit is ${limit / 1024 / 1024} MB for ${isVideo ? "videos" : "images"}.`,
    };
  }
  return { ok: true, media: isVideo ? "video" : "image" };
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
  return (
    list.find(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    ) ??
    list[0] ??
    null
  );
}
