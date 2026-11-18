/**
 * Public address of the deployed site, used for absolute links in previews,
 * the sitemap and robots.txt. Set NEXT_PUBLIC_SITE_URL when deploying.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Mockform";
export const SITE_TITLE = "Mockform — Device mockups from screenshots";
export const SITE_DESCRIPTION =
  "Turn screenshots and screen recordings into polished device mockups, right in your browser. 25 devices, layouts, perspective and video export. No uploads, no sign-up.";
