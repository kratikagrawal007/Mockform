"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { selectDevice } from "@/editor/actions";
import { FRAME_TYPES, importFrame } from "@/editor/frames/frames";
import {
  importScreenshots,
  loadImageAsset,
  registerPicker,
} from "@/editor/import/importScreenshot";
import { ACCEPTED_TYPES } from "@/editor/import/validate";
import { useEditor, useUI } from "@/editor/store/editor";
import { play } from "@/editor/video/playback";
import { deviceKeyAt } from "./Stage";

function isEditableTarget(t: EventTarget | null) {
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
  );
}

async function importBackground(files: FileList) {
  const file = files[0];
  if (!file) return;
  const asset = await loadImageAsset(file, "background");
  if (!asset) return;
  const isVideo = asset.media === "video";
  useEditor.getState().update((s) => ({
    ...s,
    background: isVideo
      ? { ...s.background, kind: "video", videoId: asset.id }
      : { ...s.background, kind: "image", imageId: asset.id },
  }));
  if (isVideo) play();
}

async function addFrame(files: FileList) {
  const file = files[0];
  if (!file) return;
  const id = await importFrame(file);
  if (id) selectDevice(id);
}

/** New videos start playing so the preview is alive straight away. */
function startIfVideo(added: boolean) {
  if (added) play();
}

/** Handles the file pickers, drag and drop anywhere on the page, and paste. */
export function ImportController() {
  const shotRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    registerPicker("screenshot", shotRef.current);
    registerPicker("background", bgRef.current);
    registerPicker("frame", frameRef.current);
  }, []);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      e.dataTransfer?.types.includes("Files") ?? false;

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      // Dropping onto a device fills that device.
      const key = deviceKeyAt(e.clientX, e.clientY);
      if (key) useUI.getState().select(key);
      if (e.dataTransfer)
        void importScreenshots(e.dataTransfer.files).then(startIfVideo);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        void importScreenshots(files).then(startIfVideo);
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  const reset = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.value = "";
  };

  return (
    <>
      <input
        ref={shotRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          const files = e.currentTarget.files;
          if (files)
            void importScreenshots(Array.from(files)).then(startIfVideo);
          reset(e);
        }}
      />
      <input
        ref={bgRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        data-testid="background-input"
        onChange={(e) => {
          const files = e.currentTarget.files;
          if (files) void importBackground(files);
          reset(e);
        }}
      />
      <input
        ref={frameRef}
        type="file"
        accept={FRAME_TYPES.join(",")}
        className="hidden"
        data-testid="frame-input"
        onChange={(e) => {
          const files = e.currentTarget.files;
          if (files) void addFrame(files);
          reset(e);
        }}
      />
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-workspace/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-accent bg-panel-solid px-10 py-8 shadow-panel">
            <ImagePlus className="size-7 text-accent-ink" aria-hidden />
            <p className="text-[15px] font-semibold">
              Drop to add screenshots or videos
            </p>
            <p className="text-muted">
              Drop on a device to fill it · images up to 50 MB, videos up to 200
              MB
            </p>
          </div>
        </div>
      )}
    </>
  );
}
