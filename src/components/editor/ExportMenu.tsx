"use client";

import { ChevronDown, Copy, Download, Film } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { ValueSlider } from "@/components/ui/ValueSlider";
import {
  canCopyImage,
  copyExport,
  downloadExport,
} from "@/editor/export/exportImage";
import { exportSize } from "@/editor/export/limits";
import {
  useAssets,
  useResolved,
  useScene,
  useUI,
  type ExportFormat,
  type ExportSettings,
} from "@/editor/store/editor";
import {
  MAX_VIDEO_SECONDS,
  VIDEO_RESOLUTIONS,
  formatTime,
  sceneMediaIds,
  timelineRange,
  videoSize,
} from "@/editor/video/timeline";

const noop = () => () => {};

/** Video facts for the current scene, or null when it has no video. */
function useVideoInfo() {
  const ids = useScene((s) => sceneMediaIds(s).join("|"));
  const timeline = useScene((s) => s.timeline);
  const images = useAssets((s) => s.images);
  const durations = ids
    .split("|")
    .map((id) => images[id])
    .filter((a) => a?.media === "video")
    .map((a) => a.duration ?? 0);
  if (!durations.length) return null;
  return timelineRange(timeline, durations);
}

/** Split button: the main half exports with the last settings, the chevron opens the options. */
export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const settings = useUI((s) => s.exportSettings);
  const setSettings = useUI((s) => s.setExportSettings);
  const { canvas } = useResolved();
  const video = useVideoInfo();
  const clipboard = useSyncExternalStore(noop, canCopyImage, () => false);
  // A saved "video" choice only applies while the scene has a video.
  const format: ExportFormat =
    settings.format === "video" && !video ? "png" : settings.format;
  const size = exportSize(canvas, settings.scale);
  const vSize = videoSize(canvas, settings.videoResolution);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const formatLabel =
    format === "png" ? "PNG" : format === "jpeg" ? "JPG" : "video";
  const run = () => void downloadExport({ ...settings, format });
  const ready = format === "video" ? (video?.exportLength ?? 0) > 0 : size.ok;

  return (
    <div ref={rootRef} className="relative ml-2">
      <div className="mf-accent-gloss flex h-9 items-stretch overflow-hidden rounded-[12px] text-on-accent">
        <button
          type="button"
          onClick={run}
          title={`Export ${formatLabel} (⌘E)`}
          className="flex items-center gap-1.5 pr-2.5 pl-3 text-ui font-semibold transition-colors hover:bg-on-accent/10"
        >
          <Download className="size-4" aria-hidden />
          Export
        </button>
        <span className="w-px bg-on-accent/20" aria-hidden />
        <button
          type="button"
          aria-label="Export options"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className="grid w-8 place-items-center transition-colors hover:bg-on-accent/10"
        >
          <ChevronDown
            className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Export options"
          className="mf-glass-strong absolute top-11 right-0 z-40 w-72 space-y-3 rounded-[var(--radius-panel)] p-3"
        >
          <div className="space-y-1.5">
            <p className="text-label font-medium text-muted">Format</p>
            <SegmentedControl<ExportFormat>
              label="Format"
              value={format}
              options={[
                { value: "png", label: "PNG" },
                { value: "jpeg", label: "JPG" },
                ...(video ? [{ value: "video" as const, label: "Video" }] : []),
              ]}
              onChange={(f) => setSettings({ format: f })}
            />
          </div>

          {format === "video" && video ? (
            <>
              <div className="space-y-1.5">
                <p className="text-label font-medium text-muted">Resolution</p>
                <SegmentedControl<"480" | "720" | "1080">
                  label="Resolution"
                  value={
                    String(settings.videoResolution) as "480" | "720" | "1080"
                  }
                  options={VIDEO_RESOLUTIONS.map((r) => ({
                    value: String(r) as "480" | "720" | "1080",
                    label: `${r}p`,
                  }))}
                  onChange={(v) =>
                    setSettings({
                      videoResolution: Number(
                        v,
                      ) as ExportSettings["videoResolution"],
                    })
                  }
                />
              </div>
              <p
                className="font-mono text-label text-faint tabular-nums"
                data-testid="export-size"
              >
                {vSize.width} × {vSize.height} px ·{" "}
                {formatTime(video.exportLength)} · 30 fps
              </p>
              <p className="text-label text-faint">
                MP4 where your browser supports it, otherwise WebM. Silent.
                {video.length > MAX_VIDEO_SECONDS &&
                  ` Capped at ${MAX_VIDEO_SECONDS} s.`}
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-label font-medium text-muted">Size</p>
                <SegmentedControl<"1" | "2" | "3">
                  label="Size"
                  value={String(settings.scale) as "1" | "2" | "3"}
                  options={[
                    { value: "1", label: "1×" },
                    { value: "2", label: "2×" },
                    { value: "3", label: "3×" },
                  ]}
                  onChange={(v) =>
                    setSettings({ scale: Number(v) as ExportSettings["scale"] })
                  }
                />
              </div>
              {format === "jpeg" ? (
                <ValueSlider
                  label="Quality"
                  value={settings.quality}
                  min={0.5}
                  max={1}
                  step={0.01}
                  defaultValue={0.92}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(quality) => setSettings({ quality })}
                />
              ) : (
                <Switch
                  label="Transparent background"
                  checked={settings.transparent}
                  onChange={(transparent) => setSettings({ transparent })}
                />
              )}
              <p
                className={`font-mono text-label tabular-nums ${size.ok ? "text-faint" : "text-danger"}`}
                data-testid="export-size"
              >
                {size.ok ? `${size.width} × ${size.height} px` : size.message}
              </p>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                setOpen(false);
                run();
              }}
              className="mf-accent-gloss flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] text-ui font-semibold text-on-accent disabled:opacity-40"
            >
              {format === "video" ? (
                <Film className="size-4" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {format === "video" ? "Export video" : `Download ${formatLabel}`}
            </button>
            {clipboard && format !== "video" && (
              <button
                type="button"
                disabled={!size.ok}
                title="Copy as PNG (⇧⌘C)"
                onClick={() => {
                  setOpen(false);
                  void copyExport();
                }}
                className="mf-glass-pill flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-3 text-ui font-medium hover:brightness-110 disabled:opacity-40"
              >
                <Copy className="size-4" aria-hidden />
                Copy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
