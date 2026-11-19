"use client";

/**
 * A slider drawn as a filled track with the label and value inside it.
 * The real <input type="range"> sits on top (invisible) so keyboard and
 * screen reader support come from the browser.
 */
export function ValueSlider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Double-click resets to this. */
  defaultValue: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  // Fill grows from zero when the range crosses it (offsets), otherwise from the left.
  const origin = min < 0 && max > 0 ? pct(0) : 0;
  const at = pct(value);
  const left = Math.min(origin, at);
  const width = Math.abs(at - origin);

  return (
    <label
      className="mf-well relative block h-9 overflow-hidden rounded-[var(--radius-control)] select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
      onDoubleClick={() => onChange(defaultValue)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 bg-active"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <span
        aria-hidden
        className="absolute inset-y-2 w-0.5 -translate-x-1/2 rounded-full bg-ink/70"
        style={{ left: `${Math.min(98.5, Math.max(1.5, at))}%` }}
      />
      <span className="absolute inset-y-0 left-3 flex items-center text-label text-muted">
        {label}
      </span>
      <span className="absolute inset-y-0 right-3 flex items-center font-mono text-label text-ink tabular-nums">
        {format(value)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </label>
  );
}
