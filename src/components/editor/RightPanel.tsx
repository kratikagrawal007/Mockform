"use client";

import {
  ChevronDown,
  Crop,
  ImagePlus,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { ValueSlider } from "@/components/ui/ValueSlider";
import { matchColors, selectDevice } from "@/editor/actions";
import {
  GRADIENTS,
  MATCHED_GRADIENT_ID,
  SOLID_SWATCHES,
  backgroundGradient,
  gradientCss,
} from "@/editor/backgrounds";
import {
  CANVAS_MAX,
  CANVAS_MIN,
  CANVAS_PRESETS,
  type CanvasPresetId,
} from "@/editor/canvas";
import {
  CATEGORY_LABELS,
  allDevices,
  getDevice,
  type DeviceCategory,
} from "@/editor/devices/catalog";
import { hasGlass } from "@/editor/devices/draw";
import { useFrames } from "@/editor/frames/frames";
import { openPicker } from "@/editor/import/importScreenshot";
import { MAX_ZOOM } from "@/editor/render/geometry";
import { formatTime } from "@/editor/video/timeline";
import { MediaThumb, PerspectiveSection, VideoSection } from "./MediaControls";
import { DEFAULT_CROP } from "@/editor/scene/defaults";
import type {
  BackgroundKind,
  DeviceInstance,
  Scene,
  ShadowPreset,
} from "@/editor/scene/types";
import {
  updateDevice,
  useEditor,
  useImage,
  useResolved,
  useScene,
  useSelectedDevice,
  useUI,
} from "@/editor/store/editor";

const update = (recipe: (s: Scene) => Scene, key?: string) =>
  useEditor.getState().update(recipe, key);

/* ---------- Canvas ---------- */

const canvasOptions = CANVAS_PRESETS.map((p) => ({
  value: p.id,
  label: p.short,
  title:
    p.id === "auto"
      ? "Original: fits the device at the screenshot's native resolution"
      : p.name,
}));

function DimensionInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-[var(--radius-control)] bg-raised px-2.5 py-1.5">
      <span className="text-label text-faint">{label}</span>
      <input
        key={value}
        type="number"
        inputMode="numeric"
        min={CANVAS_MIN}
        max={CANVAS_MAX}
        defaultValue={value}
        onBlur={(e) => onCommit(e.currentTarget.valueAsNumber)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-full min-w-0 bg-transparent text-right font-mono text-label text-ink tabular-nums outline-none"
      />
    </label>
  );
}

const clampDim = (v: number, fallback: number) =>
  Number.isFinite(v)
    ? Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(v)))
    : fallback;

function CanvasSection() {
  const preset = useScene((s) => s.canvas.preset);
  const custom = useScene((s) => s.canvas.custom);
  const setCustom = (patch: { width?: number; height?: number }) =>
    update((s) => ({
      ...s,
      canvas: {
        ...s.canvas,
        // Typing a size makes it a plain custom size again.
        custom: {
          width:
            patch.width === undefined
              ? s.canvas.custom.width
              : clampDim(patch.width, s.canvas.custom.width),
          height:
            patch.height === undefined
              ? s.canvas.custom.height
              : clampDim(patch.height, s.canvas.custom.height),
        },
      },
    }));

  return (
    <PanelSection title="Canvas">
      <SegmentedControl<CanvasPresetId>
        label="Canvas size"
        value={preset}
        options={canvasOptions}
        onChange={(id) =>
          update((s) => ({ ...s, canvas: { ...s.canvas, preset: id } }))
        }
        columns={3}
      />
      {preset === "custom" && (
        <div className="mt-2 flex gap-2">
          <DimensionInput
            label="W"
            value={custom.width}
            onCommit={(width) => setCustom({ width })}
          />
          <DimensionInput
            label="H"
            value={custom.height}
            onCommit={(height) => setCustom({ height })}
          />
        </div>
      )}
    </PanelSection>
  );
}

/* ---------- Which device the panel edits ---------- */

function DeviceTabs() {
  const devices = useScene((s) => s.devices);
  const selected = useSelectedDevice();
  const select = useUI((s) => s.select);
  if (devices.length < 2) return null;
  return (
    <div className="border-b border-hairline px-3 py-3">
      <SegmentedControl
        label="Device to edit"
        value={selected.key}
        options={devices.map((d, i) => ({
          value: d.key,
          label: `Device ${i + 1}`,
          title: getDevice(d.deviceId).name,
        }))}
        onChange={select}
      />
    </div>
  );
}

/* ---------- Screenshot ---------- */

function ScreenshotSection({ device }: { device: DeviceInstance }) {
  const shot = useImage(device.screenshotId);
  const cropping = useUI((s) => s.cropping);
  const setCropping = useUI((s) => s.setCropping);
  const setCrop = (patch: Partial<DeviceInstance["crop"]>, key?: string) =>
    updateDevice(device.key, { crop: { ...device.crop, ...patch } }, key);

  return (
    <PanelSection title="Screenshot">
      {shot ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] bg-raised p-2">
            <MediaThumb
              asset={shot}
              className="h-11 w-11 shrink-0 rounded-md object-cover object-top"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-medium" title={shot.name}>
                {shot.name}
              </p>
              <p className="font-mono text-label text-faint tabular-nums">
                {shot.width} × {shot.height}
                {shot.media === "video" &&
                  ` · ${formatTime(shot.duration ?? 0)}`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Replace screenshot"
              title="Replace (⌘O)"
              onClick={() => openPicker("screenshot")}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
            >
              <RefreshCw className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Remove screenshot"
              title="Remove"
              onClick={() => updateDevice(device.key, { screenshotId: null })}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={cropping}
              onClick={() => setCropping(!cropping)}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border text-label font-medium ${
                cropping
                  ? "border-accent bg-accent text-on-accent"
                  : "border-hairline bg-raised hover:bg-hover"
              }`}
            >
              <Crop className="size-3.5" aria-hidden />
              {cropping ? "Done cropping" : "Crop"}
            </button>
            <button
              type="button"
              onClick={() => setCrop({ ...DEFAULT_CROP })}
              disabled={
                device.crop.zoom === 1 &&
                device.crop.panX === 0 &&
                device.crop.panY === -1
              }
              className="h-9 rounded-[var(--radius-control)] border border-hairline bg-raised px-3 text-label font-medium hover:bg-hover disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          <ValueSlider
            label="Zoom"
            value={device.crop.zoom}
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            defaultValue={1}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(zoom) => setCrop({ zoom }, `zoom-${device.key}`)}
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => openPicker("screenshot")}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-raised text-ui font-medium hover:bg-hover"
          >
            <ImagePlus className="size-4" aria-hidden />
            Add screenshot
          </button>
          <p className="mt-2 text-center text-label text-faint">
            Image or video · or drop, paste, or press ⌘O
          </p>
        </>
      )}
    </PanelSection>
  );
}

/* ---------- Mockup ---------- */

function MockupSection({ device }: { device: DeviceInstance }) {
  const { canvas } = useResolved();
  useFrames((s) => s.frames); // re-render when custom frames change
  const spec = getDevice(device.deviceId);
  const set = (patch: Partial<DeviceInstance>, key?: string) =>
    updateDevice(device.key, patch, key && `${key}-${device.key}`);
  const groups = (Object.keys(CATEGORY_LABELS) as DeviceCategory[])
    .map((cat) => ({
      cat,
      items: allDevices().filter((d) => d.category === cat),
    }))
    .filter((g) => g.items.length);

  return (
    <PanelSection title="Mockup">
      <div className="space-y-2">
        <label className="relative block">
          <span className="sr-only">Device</span>
          <select
            value={device.deviceId}
            onChange={(e) => selectDevice(e.currentTarget.value)}
            className="h-9 w-full appearance-none rounded-[var(--radius-control)] border border-hairline bg-raised pr-8 pl-3 text-ui font-medium text-ink"
          >
            {groups.map(({ cat, items }) => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-2.5 right-2.5 size-4 text-faint"
          />
        </label>

        {spec.colors.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Device colour"
            className="flex items-center gap-2 px-1 py-1"
          >
            <span className="mr-auto text-label text-muted">Colour</span>
            {spec.colors.map((c) => {
              const selected = c.id === device.colorId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => set({ colorId: c.id })}
                  className={`size-6 rounded-full border border-black/20 ring-offset-2 ring-offset-panel-solid transition-shadow ${
                    selected
                      ? "ring-2 ring-accent"
                      : "hover:ring-2 hover:ring-border-strong"
                  }`}
                  style={{
                    background: `linear-gradient(160deg, ${c.edge}, ${c.body})`,
                  }}
                />
              );
            })}
          </div>
        )}

        <ValueSlider
          label="Scale"
          value={device.scale}
          min={0.2}
          max={2}
          step={0.01}
          defaultValue={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(scale) => set({ scale }, "scale")}
        />
        <ValueSlider
          label="Horizontal"
          value={device.x - 0.5}
          min={-0.5}
          max={0.5}
          step={0.001}
          defaultValue={0}
          format={(v) => `${Math.round(v * canvas.width)}px`}
          onChange={(v) => set({ x: v + 0.5 }, "x")}
        />
        <ValueSlider
          label="Vertical"
          value={device.y - 0.5}
          min={-0.5}
          max={0.5}
          step={0.001}
          defaultValue={0}
          format={(v) => `${Math.round(v * canvas.height)}px`}
          onChange={(v) => set({ y: v + 0.5 }, "y")}
        />
        <ValueSlider
          label="Rotation"
          value={device.rotation}
          min={-180}
          max={180}
          step={1}
          defaultValue={0}
          format={(v) => `${Math.round(v)}°`}
          onChange={(rotation) => set({ rotation }, "rotation")}
        />
        {hasGlass(spec) && (
          <Switch
            label="Screen glare"
            checked={device.glare}
            onChange={(glare) => set({ glare })}
          />
        )}
      </div>
    </PanelSection>
  );
}

/* ---------- Background ---------- */

const bgOptions = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "none", label: "None" },
] as const;

function Swatch({
  label,
  selected,
  background,
  onClick,
}: {
  label: string;
  selected: boolean;
  background: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`aspect-square rounded-[10px] border border-black/10 bg-cover bg-center ring-offset-2 ring-offset-panel-solid transition-shadow ${
        selected
          ? "ring-2 ring-accent"
          : "hover:ring-2 hover:ring-border-strong"
      }`}
      style={{ background }}
    />
  );
}

function BackgroundSection() {
  const bg = useScene((s) => s.background);
  const bgImage = useImage(bg.kind === "video" ? bg.videoId : bg.imageId);
  const setBg = (patch: Partial<Scene["background"]>, key?: string) =>
    update((s) => ({ ...s, background: { ...s.background, ...patch } }), key);

  return (
    <PanelSection
      title="Background"
      action={
        <button
          type="button"
          onClick={matchColors}
          title="Build a gradient from your screenshot's colours"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-label font-medium text-accent hover:bg-accent-soft"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Match colors
        </button>
      }
    >
      <SegmentedControl<BackgroundKind>
        label="Background type"
        value={bg.kind}
        options={bgOptions}
        onChange={(kind) => setBg({ kind })}
      />
      <div className="mt-3">
        {bg.kind === "gradient" && (
          <div
            role="radiogroup"
            aria-label="Gradient"
            className="grid grid-cols-4 gap-2"
          >
            {bg.matched && (
              <Swatch
                label="Matched"
                selected={bg.gradientId === MATCHED_GRADIENT_ID}
                background={gradientCss(
                  backgroundGradient({
                    ...bg,
                    gradientId: MATCHED_GRADIENT_ID,
                  }),
                )}
                onClick={() => setBg({ gradientId: MATCHED_GRADIENT_ID })}
              />
            )}
            {GRADIENTS.map((g) => (
              <Swatch
                key={g.id}
                label={g.name}
                selected={g.id === bg.gradientId}
                background={gradientCss(g)}
                onClick={() => setBg({ gradientId: g.id })}
              />
            ))}
          </div>
        )}
        {bg.kind === "solid" && (
          <div
            role="radiogroup"
            aria-label="Colour"
            className="grid grid-cols-5 gap-2"
          >
            {SOLID_SWATCHES.map((s) => (
              <Swatch
                key={s.color}
                label={s.name}
                selected={s.color.toLowerCase() === bg.color.toLowerCase()}
                background={s.color}
                onClick={() => setBg({ color: s.color })}
              />
            ))}
            <label
              title="Custom colour"
              className="relative grid aspect-square cursor-pointer place-items-center rounded-[10px] border border-dashed border-border-strong text-muted hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            >
              <Plus className="size-4" aria-hidden />
              <input
                type="color"
                aria-label="Custom colour"
                value={bg.color}
                onChange={(e) =>
                  setBg({ color: e.currentTarget.value }, "background.color")
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
        {(bg.kind === "image" || bg.kind === "video") &&
          (bgImage ? (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] bg-raised p-2">
              <MediaThumb
                asset={bgImage}
                className="h-11 w-14 shrink-0 rounded-md object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-label font-medium">
                {bgImage.name}
              </p>
              <button
                type="button"
                aria-label={`Replace background ${bg.kind}`}
                onClick={() => openPicker("background")}
                className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
              >
                <RefreshCw className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openPicker("background")}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-raised text-ui font-medium hover:bg-hover"
            >
              <ImagePlus className="size-4" aria-hidden />
              Choose background {bg.kind}
            </button>
          ))}
        {bg.kind === "none" && (
          <p className="text-label text-faint">
            Transparent. PNG exports keep the transparency; JPG gets white.
          </p>
        )}
      </div>
    </PanelSection>
  );
}

/* ---------- Shadow ---------- */

const shadowOptions = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
] as const;

function ShadowSection() {
  const shadow = useScene((s) => s.shadow);
  return (
    <PanelSection title="Shadow">
      <SegmentedControl<ShadowPreset>
        label="Shadow"
        value={shadow}
        options={shadowOptions}
        onChange={(v) => update((s) => ({ ...s, shadow: v }))}
      />
    </PanelSection>
  );
}

export function RightPanel() {
  const device = useSelectedDevice();
  return (
    <Panel label="Scene settings" className="w-[296px]">
      <CanvasSection />
      <DeviceTabs />
      <ScreenshotSection device={device} />
      <MockupSection device={device} />
      <PerspectiveSection device={device} />
      <VideoSection />
      <BackgroundSection />
      <ShadowSection />
    </Panel>
  );
}
