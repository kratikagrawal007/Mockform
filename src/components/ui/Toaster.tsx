"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useToasts } from "@/editor/toasts";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className="mf-glass-strong pointer-events-auto flex items-center gap-2 rounded-full py-2 pr-2 pl-3 text-ui shadow-panel"
        >
          {t.tone === "error" ? (
            <CircleAlert className="size-4 text-danger" aria-hidden />
          ) : (
            <CircleCheck className="size-4 text-accent-ink" aria-hidden />
          )}
          {t.message}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="grid size-6 place-items-center rounded-full text-faint hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
