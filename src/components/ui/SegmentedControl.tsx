"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

/**
 * Pill-style single choice. Behaves like a radio group:
 * Tab focuses the selected option, arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-[12px] bg-raised p-1"
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-[8px] px-2 py-1.5 text-label font-medium transition-colors duration-150 ${
              selected
                ? "bg-panel-solid text-ink shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
                : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
