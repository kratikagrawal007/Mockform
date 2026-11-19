# Mockform

Turn screenshots into polished device mockups, right in your browser.

Drop in a screenshot, pick a device, tune the scene and export. Everything runs locally: no accounts, no uploads, and nothing leaves your machine.

## Status

Mockform is in active development. You can already:

- Add screenshots or screen recordings by clicking, dragging and dropping (onto a specific device, too), pasting, or pressing ⌘O. PNG, JPG or WebP up to 50 MB; MP4, WebM or MOV up to 200 MB. Several at once fill a layout's devices in order
- Choose from 25 original devices (phones, tablets, laptops, desktops, a watch, browser and app windows, frameless and a spatial glass panel), each with colour options, or upload your own frame: Mockform finds the transparent screen automatically
- Arrange up to three devices with the Solo, Duo, Stack, Fan, Laptop + Phone and Phone + Tablet layouts
- Drag, scale and rotate devices on the canvas with snapping guides, nudge with the arrow keys, and crop or zoom each screenshot inside its screen
- Pick a canvas size or one of 13 social presets, or start from one of 5 showcase scenes
- Tilt each device to one of five perspective angles (rendered with WebGL2, flat where it's unavailable)
- Use a solid, gradient, image, video or transparent background, or let Match colors build a gradient from your screenshot
- Play videos in sync, trim them, and export a silent MP4 (or WebM) at 480p, 720p or 1080p, up to 60 seconds
- Export PNG or JPG at 1×, 2× or 3×, with an optional transparent background, or copy to the clipboard
- Undo and redo every change; your session is saved in the browser and restored when you come back

## Getting started

Requires Node 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command             | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`       | Start the development server                                                 |
| `npm run build`     | Build a static export into `out/`                                            |
| `npm start`         | Serve the static build on http://localhost:3100                              |
| `npm run typecheck` | Type-check with TypeScript                                                   |
| `npm run lint`      | Lint with ESLint                                                             |
| `npm run format`    | Format with Prettier                                                         |
| `npm test`          | Run unit tests with Vitest                                                   |
| `npm run test:e2e`  | Build, serve and run end-to-end tests (Playwright)                           |
| `npm run assets`    | Regenerate icons, link preview and launch images (needs `npm start` running) |

## Deploying

Mockform builds to plain static files in `out/`, so any static host works. On Vercel, import the repository with the default Next.js settings.

Set `NEXT_PUBLIC_SITE_URL` to the public address (for example `https://mockform.example.com`) so link previews, the sitemap and robots.txt use absolute URLs.

## Accessibility

The editor is fully usable from the keyboard, respects reduced motion, and is checked against WCAG 2.1 AA with axe in both themes as part of the end-to-end tests.

## Tech stack

Next.js (App Router, static export), React, TypeScript, Tailwind CSS, Zustand, Lucide icons, WebGL2 for perspective, WebCodecs with Mediabunny for video export, Vitest and Playwright. The UI uses the Geist and Geist Mono typefaces, bundled at build time.

## Project structure

```
src/app/              App entry, layout, global styles and design tokens
src/components/ui/    Reusable UI primitives
src/components/editor/ Editor: top bar, panels, stage, export menu, import handling
src/editor/           Framework-free core: scene model, undo history, devices,
                      renderer, import, export
src/lib/              Small helpers (theme)
e2e/                  End-to-end and accessibility tests
scripts/              Launch-asset generator
marketing/            Generated launch images
```

## Privacy

Mockform processes every image and video in your browser; nothing is uploaded. The live site counts visits with Vercel Web Analytics, which is anonymous and cookie-free. See the [privacy page](src/app/privacy/page.tsx).

## License

[MIT](LICENSE) © 2026 Kratik Agrawal
