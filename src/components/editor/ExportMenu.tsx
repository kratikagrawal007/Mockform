"use client";

import { ChevronDown, Copy, Download } from "lucide-react";
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
  useResolved,
  useUI,
  type ExportFormat,
  type ExportSettings,
} from "@/editor/store/editor";

const noop = () => () => {};

/** Split button: the main half exports with the last settings, the chevron opens the options. */
export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const settings = useUI((s) => s.exportSettings);
  const setSettings = useUI((s) => s.setExportSettings);
  const { canvas } = useResolved();
  const size = exportSize(canvas, settings.scale);
  const clipboard = useSyncExternalStore(noop, canCopyImage, () => false);

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

  const formatLabel = settings.format === "png" ? "PNG" : "JPG";

  return (
    <div ref={rootRef} className="relative ml-2">
      <div className="flex h-9 items-stretch overflow-hidden rounded-[12px] bg-accent text-on-accent shadow-[0_6px_16px_-6px_var(--mf-accent)]">
        <button
          type="button"
          onClick={() => void downloadExport()}
          title={`Export ${formatLabel} ${settings.scale}× (⌘E)`}
          className="flex items-center gap-1.5 pr-2.5 pl-3 text-ui font-semibold transition-colors hover:bg-accent-hover"
        >
          <Download className="size-4" aria-hidden />
          Export
        </button>
        <span className="w-px bg-white/25" aria-hidden />
        <button
          type="button"
          aria-label="Export options"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className="grid w-8 place-items-center transition-colors hover:bg-accent-hover"
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
          className="absolute top-11 right-0 z-40 w-72 space-y-3 rounded-[var(--radius-panel)] border border-hairline bg-panel-solid p-3 shadow-panel"
        >
          <div className="space-y-1.5">
            <p className="text-label font-medium text-muted">Format</p>
            <SegmentedControl<ExportFormat>
              label="Format"
              value={settings.format}
              options={[
                { value: "png", label: "PNG" },
                { value: "jpeg", label: "JPG" },
              ]}
              onChange={(format) => setSettings({ format })}
            />
          </div>
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
          {settings.format === "jpeg" ? (
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
            className={`font-mono text-label tabular-nums ${size.ok ? "text-faint" : "text-[#ff6b5e]"}`}
            data-testid="export-size"
          >
            {size.ok ? `${size.width} × ${size.height} px` : size.message}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!size.ok}
              onClick={() => {
                setOpen(false);
                void downloadExport();
              }}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-accent text-ui font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-40"
            >
              <Download className="size-4" aria-hidden />
              Download {formatLabel}
            </button>
            {clipboard && (
              <button
                type="button"
                disabled={!size.ok}
                title="Copy as PNG (⇧⌘C)"
                onClick={() => {
                  setOpen(false);
                  void copyExport();
                }}
                className="flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-hairline bg-raised px-3 text-ui font-medium hover:bg-hover disabled:opacity-40"
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
