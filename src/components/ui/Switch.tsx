"use client";

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="mf-well flex h-9 w-full items-center justify-between rounded-[var(--radius-control)] px-3 text-label text-muted"
    >
      {label}
      <span
        aria-hidden
        className={`relative block h-[18px] w-8 shrink-0 rounded-full transition-colors duration-150 ${checked ? "bg-accent" : "bg-border-strong"}`}
      >
        <span
          className={`absolute top-[2px] left-0 block size-[14px] rounded-full shadow transition-[transform,background-color] duration-150 ${
            // On the accent track the knob takes the contrasting colour (dark on white, white on black).
            checked
              ? "translate-x-[16px] bg-on-accent"
              : "translate-x-[2px] bg-white"
          }`}
        />
      </span>
    </button>
  );
}
