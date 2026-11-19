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
  const dragTarget = useUI((s) => s.fileDrag.targetKey);

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
      useUI.getState().setFileDrag({
        active: true,
        targetKey: deviceKeyAt(e.clientX, e.clientY),
      });
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      // Light up the device the file would land on.
      useUI.getState().setFileDrag({
        active: true,
        targetKey: deviceKeyAt(e.clientX, e.clientY),
      });
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setDragging(false);
        useUI.getState().setFileDrag({ active: false, targetKey: null });
      }
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      useUI.getState().setFileDrag({ active: false, targetKey: null });
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
        // A light hint instead of a full-screen card, so the devices stay visible
        // and the one under the pointer can light up.
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <div className="mf-glass-strong flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3.5">
            <ImagePlus className="size-4 text-accent-ink" aria-hidden />
            <p className="text-ui font-medium">
              {dragTarget
                ? "Release to add it to this device"
                : "Drop on a device to fill it"}
            </p>
            <span className="text-label text-faint">
              Images up to 50 MB · videos up to 200 MB
            </span>
          </div>
        </div>
      )}
    </>
  );
}
