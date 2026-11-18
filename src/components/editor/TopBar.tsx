"use client";

import { Info, Keyboard, Redo2, Undo2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useEditor, useUI } from "@/editor/store/editor";
import { ExportMenu } from "./ExportMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const canUndo = useEditor((s) => s.history.past.length > 0);
  const canRedo = useEditor((s) => s.history.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const openDialog = useUI((s) => s.openDialog);

  return (
    <header className="flex h-14 items-center justify-between px-4">
      <Logo />

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-[12px] border border-hairline bg-panel p-0.5 backdrop-blur-xl">
          <ThemeToggle />
          <IconButton
            label="Keyboard shortcuts"
            shortcut="?"
            onClick={() => openDialog("shortcuts")}
          >
            <Keyboard className="size-4" />
          </IconButton>
          <IconButton
            label="About Mockform"
            onClick={() => openDialog("about")}
          >
            <Info className="size-4" />
          </IconButton>
        </div>

        <div className="ml-1 flex items-center gap-0.5 rounded-[12px] border border-hairline bg-panel p-0.5 backdrop-blur-xl">
          <IconButton
            label="Undo"
            shortcut="⌘Z"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton
            label="Redo"
            shortcut="⇧⌘Z"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 className="size-4" />
          </IconButton>
        </div>

        <ExportMenu />
      </div>
    </header>
  );
}
