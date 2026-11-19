"use client";

import { Dialog } from "@/components/ui/Dialog";
import { cancelVideoExport } from "@/editor/export/exportImage";
import { useUI } from "@/editor/store/editor";

export function VideoExportProgress() {
  const progress = useUI((s) => s.videoProgress);
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <Dialog
      open={progress !== null}
      title="Exporting video"
      onClose={cancelVideoExport}
    >
      <div className="space-y-3 pb-1">
        <p className="text-muted">
          Rendering every frame on your device. Keep this tab open.
        </p>
        <div
          role="progressbar"
          aria-label="Export progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mf-well h-2 overflow-hidden rounded-full"
        >
          <div
            className="mf-accent-gloss h-full rounded-full transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-label text-faint tabular-nums">
            {pct}%
          </span>
          <button
            type="button"
            onClick={cancelVideoExport}
            className="h-8 rounded-[var(--radius-control)] border border-hairline bg-raised px-3 text-label font-medium hover:bg-hover"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
