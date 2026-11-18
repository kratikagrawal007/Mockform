"use client";

import { useEffect } from "react";
import { nudgeSelected } from "@/editor/actions";
import { copyExport, downloadExport } from "@/editor/export/exportImage";
import { openPicker } from "@/editor/import/importScreenshot";
import { useEditor, useUI } from "@/editor/store/editor";

function inTextField(t: EventTarget | null) {
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      (t.tagName === "INPUT" &&
        !["checkbox", "radio", "button"].includes(
          (t as HTMLInputElement).type,
        )))
  );
}

/** Elements where arrow keys already mean something. */
function ownsArrows(t: EventTarget | null) {
  return (
    inTextField(t) ||
    (t instanceof HTMLElement &&
      (t.getAttribute("role") === "radio" ||
        t.closest("[role=dialog]") !== null))
  );
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Global editor shortcuts. Text fields keep their own undo, copy and arrows. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if (ui.dialog) return; // dialogs handle their own keys
      const typing = inTextField(e.target);
      const mod = e.metaKey || e.ctrlKey;

      if (!mod && !e.altKey) {
        if (e.key === "?" && !typing) {
          e.preventDefault();
          ui.openDialog("shortcuts");
        } else if (e.key === "Escape" && ui.cropping) {
          ui.setCropping(false);
        } else if (ARROWS[e.key] && !ownsArrows(e.target)) {
          e.preventDefault();
          const [dx, dy] = ARROWS[e.key];
          const step = e.shiftKey ? 10 : 1;
          nudgeSelected(dx * step, dy * step);
        }
        return;
      }

      if (!mod || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      } else if (key === "y" && !typing) {
        e.preventDefault();
        useEditor.getState().redo();
      } else if (key === "o") {
        e.preventDefault();
        openPicker("screenshot");
      } else if (key === "e" && !e.shiftKey) {
        e.preventDefault();
        void downloadExport();
      } else if (key === "c" && e.shiftKey && !typing) {
        e.preventDefault();
        void copyExport();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "O"], label: "Add a screenshot" },
  { keys: ["⌘", "V"], label: "Paste a screenshot" },
  { keys: ["⌘", "E"], label: "Export with current settings" },
  { keys: ["⇧", "⌘", "C"], label: "Copy image to clipboard" },
  { keys: ["⌘", "Z"], label: "Undo" },
  { keys: ["⇧", "⌘", "Z"], label: "Redo" },
  { keys: ["←", "↑", "→", "↓"], label: "Nudge the selected device 1 px" },
  { keys: ["⇧", "Arrow"], label: "Nudge 10 px" },
  { keys: ["Shift", "drag"], label: "Turn off snapping while dragging" },
  { keys: ["Double-click"], label: "Crop the screenshot in a device" },
  { keys: ["Esc"], label: "Finish cropping, close menus" },
  { keys: ["?"], label: "Show this list" },
];
