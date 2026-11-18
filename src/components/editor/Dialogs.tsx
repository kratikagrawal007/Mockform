"use client";

import { Dialog } from "@/components/ui/Dialog";
import { useUI } from "@/editor/store/editor";
import { SHORTCUTS } from "@/hooks/useShortcuts";
import { Logo } from "./Logo";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="min-w-6 rounded-md border border-border-strong bg-raised px-1.5 py-0.5 text-center font-mono text-label text-ink">
      {children}
    </kbd>
  );
}

export function Dialogs() {
  const dialog = useUI((s) => s.dialog);
  const close = () => useUI.getState().openDialog(null);

  return (
    <>
      <Dialog
        open={dialog === "shortcuts"}
        title="Keyboard shortcuts"
        onClose={close}
      >
        <ul className="divide-y divide-hairline">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-4 py-2"
            >
              <span className="text-muted">{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-label text-faint">
          On Windows and Linux, use Ctrl instead of ⌘.
        </p>
      </Dialog>

      <Dialog open={dialog === "about"} title="About Mockform" onClose={close}>
        <div className="space-y-3 pb-1">
          <Logo />
          <p>
            Turn screenshots into polished device mockups, right in your
            browser.
          </p>
          <p className="text-muted">
            Everything happens on your device. Your screenshots are never
            uploaded, and your work is saved in this browser so it&rsquo;s still
            here when you come back.
          </p>
          <p className="text-muted">
            All device artwork is original and uses generic names. Product and
            platform names in the size presets only describe dimensions.
          </p>
          <p className="border-t border-hairline pt-3 text-label text-faint">
            Version 0.4 · © 2026 Kratik Agrawal · MIT licence
          </p>
        </div>
      </Dialog>
    </>
  );
}
