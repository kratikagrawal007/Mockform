"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Modal built on <dialog>: the browser handles focus trapping, Esc and the backdrop. */
export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-hairline bg-panel-solid p-0 text-ink shadow-panel backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
    </dialog>
  );
}
