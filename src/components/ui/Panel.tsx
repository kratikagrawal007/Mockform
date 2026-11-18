"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export function Panel({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={label}
      className={`flex flex-col overflow-y-auto rounded-[var(--radius-panel)] border border-hairline bg-panel shadow-panel backdrop-blur-xl ${className}`}
    >
      {children}
    </aside>
  );
}

export function PanelSection({
  title,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="border-b border-hairline px-3 py-3 last:border-b-0">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="-mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-ui font-semibold tracking-[-0.01em] text-ink"
        >
          {title}
          <ChevronDown
            aria-hidden
            className={`size-3.5 text-faint transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
        </button>
        {action}
      </div>
      {open && (
        <div id={bodyId} className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
}

/** Muted placeholder for sections that are wired up in a later phase. */
export function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-control)] border border-dashed border-border-strong px-3 py-2.5 text-label text-faint">
      {children}
    </p>
  );
}
