"use client";

import { Pause, Play } from "lucide-react";
import { useSyncExternalStore } from "react";
import { PanelSection } from "@/components/ui/Panel";
import { ValueSlider } from "@/components/ui/ValueSlider";
import {
  PERSPECTIVES,
  projectCorners,
  type PerspectiveId,
} from "@/editor/render/perspective";
import { webglAvailable } from "@/editor/render/webglProject";
import type { DeviceInstance, Scene } from "@/editor/scene/types";
import {
  updateDevice,
  useAssets,
  useEditor,
  useScene,
  type ImageAsset,
} from "@/editor/store/editor";
import { pause, play, seek, usePlayback } from "@/editor/video/playback";
import {
  MAX_VIDEO_SECONDS,
  formatTime,
  sceneMediaIds,
  timelineRange,
} from "@/editor/video/timeline";

/** Thumbnail for an image or a (muted, looping) video asset. */
export function MediaThumb({
  asset,
  className,
}: {
  asset: ImageAsset;
  className: string;
}) {
  if (asset.media === "video") {
    return (
      <video
        src={asset.previewUrl}
        muted
        loop
        autoPlay
        playsInline
        aria-hidden
        className={className}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- local object URL, nothing to optimise
  return <img src={asset.previewUrl} alt="" className={className} />;
}

/* ---------- Perspective ---------- */

function AngleIcon({ id }: { id: PerspectiveId }) {
  const p = PERSPECTIVES.find((x) => x.id === id)!;
  const c = projectCorners(14, 22, p);
  const pts = [c[0], c[1], c[3], c[2]]
    .map((q) => `${q.x + 16},${q.y + 16}`)
    .join(" ");
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <polygon
        points={pts}
        className="fill-raised stroke-current"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const noop = () => () => {};

export function PerspectiveSection({ device }: { device: DeviceInstance }) {
  const supported = useSyncExternalStore(noop, webglAvailable, () => true);
  return (
    <PanelSection title="Perspective">
      <div
        role="radiogroup"
        aria-label="Angle"
        className="grid grid-cols-3 gap-1.5"
      >
        {PERSPECTIVES.map((p) => {
          const selected = p.id === device.perspective;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!supported && p.id !== "flat"}
              onClick={() => updateDevice(device.key, { perspective: p.id })}
              className={`flex flex-col items-center gap-0.5 rounded-[10px] border px-1 py-1.5 transition-colors duration-150 disabled:opacity-35 ${
                selected
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-hairline text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <AngleIcon id={p.id} />
              <span className="text-[10px] leading-3 font-medium text-ink">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>
      {!supported && (
        <p className="mt-2 text-label text-faint">
          Angles need WebGL2, which this browser has turned off.
        </p>
      )}
    </PanelSection>
  );
}

/* ---------- Video timeline ---------- */

function useSceneVideos() {
  const ids = useScene((s) => sceneMediaIds(s).join("|"));
  const images = useAssets((s) => s.images);
  return ids
    .split("|")
    .map((id) => images[id])
    .filter((a): a is ImageAsset => !!a && a.media === "video");
}

export function VideoSection() {
  const videos = useSceneVideos();
  const timeline = useScene((s) => s.timeline);
  const playing = usePlayback((s) => s.playing);
  const time = usePlayback((s) => s.time);
  if (!videos.length) return null;

  const range = timelineRange(
    timeline,
    videos.map((v) => v.duration ?? 0),
  );
  const setTimeline = (patch: Partial<Scene["timeline"]>, key: string) =>
    useEditor
      .getState()
      .update((s) => ({ ...s, timeline: { ...s.timeline, ...patch } }), key);

  return (
    <PanelSection title="Video">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => (playing ? pause() : play())}
            className="mf-accent-gloss grid size-9 shrink-0 place-items-center rounded-full text-on-accent"
          >
            {playing ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="ml-0.5 size-4" aria-hidden />
            )}
          </button>
          <input
            type="range"
            aria-label="Playhead"
            min={0}
            max={Math.max(0.01, range.length)}
            step={0.01}
            value={Math.min(time, range.length)}
            onChange={(e) => seek(e.currentTarget.valueAsNumber)}
            className="min-w-0 flex-1 accent-[var(--mf-accent)]"
          />
          <span
            className="font-mono text-label text-faint tabular-nums"
            data-testid="video-time"
          >
            {formatTime(Math.min(time, range.length))}
          </span>
        </div>
        <ValueSlider
          label="Trim start"
          value={range.start}
          min={0}
          max={range.full}
          step={0.1}
          defaultValue={0}
          format={formatTime}
          onChange={(v) =>
            setTimeline({ start: Math.min(v, range.end - 0.1) }, "trim-start")
          }
        />
        <ValueSlider
          label="Trim end"
          value={range.end}
          min={0}
          max={range.full}
          step={0.1}
          defaultValue={range.full}
          format={formatTime}
          onChange={(v) =>
            setTimeline(
              { end: v >= range.full ? null : Math.max(v, range.start + 0.1) },
              "trim-end",
            )
          }
        />
        <p className="text-label text-faint" data-testid="video-length">
          Plays {formatTime(range.length)}
          {range.length > MAX_VIDEO_SECONDS
            ? ` · exports the first ${MAX_VIDEO_SECONDS} s`
            : ""}
          . Shorter clips loop.
        </p>
      </div>
    </PanelSection>
  );
}
