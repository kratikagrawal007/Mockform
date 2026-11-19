"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { restoreSession, startAutosave } from "@/editor/persist/session";
import { useScene, useUI } from "@/editor/store/editor";
import { useShortcuts } from "@/hooks/useShortcuts";
import { Dialogs } from "./Dialogs";
import { ImportController } from "./ImportController";
import { LeftPanel } from "./LeftPanel";
import { ProgressRail } from "./ProgressRail";
import { RightPanel } from "./RightPanel";
import { Stage } from "./Stage";
import { TopBar } from "./TopBar";
import { VideoExportProgress } from "./VideoExportProgress";
import { WorkspaceSpotlight } from "./WorkspaceSpotlight";

function useProgressStep() {
  const hasShot = useScene((s) =>
    s.devices.some((d) => d.screenshotId !== null),
  );
  const deviceTouched = useUI((s) => s.deviceTouched);
  const exported = useUI((s) => s.exported);
  if (!hasShot) return 0;
  if (!deviceTouched) return 1;
  if (!exported) return 2;
  return 3;
}

/** Restores the last session once, then saves changes as they happen. */
function useSession() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    restoreSession()
      .catch(() => {
        // A broken save shouldn't block the editor; start fresh.
      })
      .finally(() => {
        if (cancelled) return;
        stop = startAutosave();
        setReady(true);
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return ready;
}

export function EditorShell() {
  useShortcuts();
  const ready = useSession();
  const step = useProgressStep();

  return (
    <div
      className="relative hidden h-dvh flex-col bg-workspace md:flex"
      data-testid="editor"
      data-ready={ready ? "true" : "false"}
    >
      <div
        aria-hidden
        className="mf-ambient pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="mf-dot-grid pointer-events-none absolute inset-0"
      />
      <WorkspaceSpotlight />

      <div className="relative z-10">
        <TopBar />
      </div>

      <div className="relative z-0 flex min-h-0 flex-1 gap-3 px-3 pb-3">
        <LeftPanel />
        <main className="flex min-w-0 flex-1 flex-col items-center gap-4 py-2">
          <ProgressRail current={step} />
          <div className="min-h-0 w-full flex-1 px-6 pb-6">
            <Stage />
          </div>
        </main>
        <RightPanel />
      </div>

      <ImportController />
      <Dialogs />
      <VideoExportProgress />
      <Toaster />
    </div>
  );
}
