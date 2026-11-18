"use client";

import { RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/editor/Logo";
import { clearSavedSession } from "@/editor/persist/session";

/** Shown if the editor crashes while rendering. */
export default function EditorError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-5 bg-workspace px-6 text-center">
      <Logo />
      <div className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-[17px] font-semibold tracking-[-0.01em]">
          Something went wrong
        </h1>
        <p className="text-muted">
          Mockform hit an unexpected problem. Your work is saved in this
          browser, so trying again usually picks up where you left off.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={retry}
          className="flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent px-4 text-ui font-semibold text-on-accent hover:bg-accent-hover"
        >
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </button>
        <button
          type="button"
          disabled={clearing}
          onClick={async () => {
            setClearing(true);
            await clearSavedSession();
            window.location.reload();
          }}
          className="flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-hairline bg-raised px-4 text-ui font-medium hover:bg-hover disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
          {clearing ? "Clearing…" : "Start fresh"}
        </button>
      </div>
      <p className="max-w-sm text-label text-faint">
        Start fresh clears the saved scene, screenshots, videos and custom
        frames stored in this browser.
      </p>
    </main>
  );
}
