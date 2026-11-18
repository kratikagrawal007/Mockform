"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  applyShowcaseScene,
  applySocial,
  selectDevice,
  setLayout,
} from "@/editor/actions";
import { gradientCss, getGradient } from "@/editor/backgrounds";
import {
  CATEGORY_LABELS,
  DEVICES,
  getDevice,
  getDeviceColor,
  type DeviceCategory,
  type DeviceSpec,
} from "@/editor/devices/catalog";
import { removeFrame, useFrames } from "@/editor/frames/frames";
import { openPicker } from "@/editor/import/importScreenshot";
import { LAYOUTS, type LayoutDef } from "@/editor/layouts";
import { SHOWCASE_PRESETS, SOCIAL_PRESETS } from "@/editor/presets";
import { useScene, useSelectedDevice } from "@/editor/store/editor";
import { DeviceThumb } from "./DeviceThumb";

type Filter = "all" | DeviceCategory;

function DeviceCard({
  spec,
  selected,
  colorId,
}: {
  spec: DeviceSpec;
  selected: boolean;
  colorId: string;
}) {
  const color = selected ? getDeviceColor(spec, colorId) : spec.colors[0];
  return (
    <div className="group relative">
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => selectDevice(spec.id)}
        className={`flex w-full flex-col items-center gap-1 rounded-[12px] border p-2 transition-colors duration-150 ${
          selected
            ? "border-accent bg-accent-soft"
            : "border-hairline hover:bg-hover"
        }`}
      >
        <DeviceThumb spec={spec} color={color} width={96} height={72} />
        <span className="w-full truncate text-center text-label font-medium">
          {spec.name}
        </span>
      </button>
      {spec.category === "custom" && (
        <button
          type="button"
          aria-label={`Remove ${spec.name}`}
          title="Remove frame"
          onClick={() => removeFrame(spec.id)}
          className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-panel-solid/90 text-muted opacity-0 shadow-sm group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function DevicesSection() {
  const [filter, setFilter] = useState<Filter>("all");
  const frames = useFrames((s) => s.frames);
  const current = useSelectedDevice();
  const custom = frames
    .map((f) => getDevice(f.id))
    .filter((d) => d.category === "custom");
  const all = [...DEVICES, ...custom];
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...(Object.keys(CATEGORY_LABELS) as DeviceCategory[])
      .filter((c) => c === "custom" || DEVICES.some((d) => d.category === c))
      .map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];
  const visible = all.filter((d) => filter === "all" || d.category === filter);
  const count = (c: Filter) =>
    c === "all" ? all.length : all.filter((d) => d.category === c).length;

  return (
    <PanelSection title="Devices">
      <div
        role="radiogroup"
        aria-label="Device category"
        className="mb-3 flex flex-wrap gap-1"
      >
        {filters.map((f) => {
          const selected = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-label font-medium transition-colors duration-150 ${
                selected
                  ? "border-transparent bg-accent text-on-accent"
                  : "border-hairline text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              {f.label}
              <span
                className={`font-mono text-[10px] ${selected ? "text-on-accent" : "text-faint"}`}
              >
                {count(f.id)}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="grid grid-cols-2 gap-2" aria-label="Devices">
        {visible.map((spec) => (
          <li key={spec.id}>
            <DeviceCard
              spec={spec}
              selected={spec.id === current.deviceId}
              colorId={current.colorId}
            />
          </li>
        ))}
        {(filter === "custom" || filter === "all") && (
          <li>
            <button
              type="button"
              onClick={() => openPicker("frame")}
              className="flex h-full min-h-[106px] w-full flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-border-strong p-2 text-muted hover:bg-hover hover:text-ink"
            >
              <Plus className="size-4" aria-hidden />
              <span className="text-label font-medium">Add your frame</span>
              <span className="text-[10px] text-faint">
                PNG with a transparent screen
              </span>
            </button>
          </li>
        )}
      </ul>
    </PanelSection>
  );
}

const SLOT_SHAPES: Record<string, number> = { laptops: 1.55, tablets: 0.72 };

function LayoutIcon({ layout }: { layout: LayoutDef }) {
  return (
    <svg viewBox="0 0 60 44" className="h-11 w-full" aria-hidden>
      {layout.slots.map((s, i) => {
        const ratio = (s.category && SLOT_SHAPES[s.category]) || 0.48;
        const h = (ratio > 1 ? 22 : 34) * s.scale;
        const w = h * ratio;
        return (
          <rect
            key={i}
            x={s.x * 60 - w / 2}
            y={s.y * 44 - h / 2}
            width={w}
            height={h}
            rx={ratio > 1 ? 1.5 : 3}
            transform={`rotate(${s.rotation} ${s.x * 60} ${s.y * 44})`}
            className="fill-raised stroke-current"
            strokeWidth={1.2}
          />
        );
      })}
    </svg>
  );
}

function LayoutsSection() {
  const layout = useScene((s) => s.layout);
  return (
    <PanelSection title="Layouts">
      <div
        role="radiogroup"
        aria-label="Layout"
        className="grid grid-cols-3 gap-2"
      >
        {LAYOUTS.map((l) => {
          const selected = l.id === layout;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={l.name}
              onClick={() => setLayout(l.id)}
              className={`flex flex-col items-center gap-1 rounded-[10px] border px-1 pt-1.5 pb-1 transition-colors duration-150 ${
                selected
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-hairline text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <LayoutIcon layout={l} />
              <span className="w-full truncate text-center text-[10px] leading-3 font-medium text-ink">
                {l.name}
              </span>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}

function PresetsSection() {
  const [tab, setTab] = useState<"social" | "showcase">("social");
  const canvasLabel = useScene((s) =>
    s.canvas.preset === "custom" ? s.canvas.custom.label : undefined,
  );
  return (
    <PanelSection title="Presets">
      <SegmentedControl
        label="Preset type"
        value={tab}
        options={[
          { value: "social", label: `Social ${SOCIAL_PRESETS.length}` },
          { value: "showcase", label: `Showcase ${SHOWCASE_PRESETS.length}` },
        ]}
        onChange={setTab}
      />
      {tab === "social" ? (
        <ul className="mt-2 space-y-0.5" aria-label="Social sizes">
          {SOCIAL_PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={canvasLabel === p.name}
                onClick={() => applySocial(p)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-label ${
                  canvasLabel === p.name
                    ? "bg-accent-soft text-ink"
                    : "text-muted hover:bg-hover hover:text-ink"
                }`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-faint tabular-nums">
                  {p.width}×{p.height}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 space-y-2" aria-label="Showcase scenes">
          {SHOWCASE_PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => applyShowcaseScene(p)}
                className="flex w-full items-center gap-2.5 rounded-[10px] border border-hairline p-1.5 text-left hover:bg-hover"
              >
                <span
                  aria-hidden
                  className="h-10 w-14 shrink-0 rounded-md"
                  style={{
                    background:
                      p.background.kind === "gradient"
                        ? gradientCss(getGradient(p.background.gradientId))
                        : p.background.color,
                  }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-label font-medium text-ink">
                    {p.name}
                  </span>
                  <span className="block truncate text-[10px] text-faint">
                    {p.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

export function LeftPanel() {
  return (
    <Panel label="Devices, layouts and presets" className="w-[264px]">
      <DevicesSection />
      <LayoutsSection />
      <PresetsSection />
    </Panel>
  );
}
