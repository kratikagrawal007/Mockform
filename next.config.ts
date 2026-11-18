import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mockform runs entirely in the browser, so it ships as static files.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
