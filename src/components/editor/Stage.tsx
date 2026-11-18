"use client";

import { Crop as CropIcon, ImagePlus, RotateCw } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { fitInside } from "@/editor/canvas";
import { openPicker } from "@/editor/import/importScreenshot";
import { snapAngle, snapPosition, type Guide } from "@/editor/interaction/snap";
import {
  MAX_ZOOM,
  clamp,
  hitDevice,
  panRange,
  placeDevice,
  type Placement,
} from "@/editor/render/geometry";
import { renderScene } from "@/editor/render/renderScene";
import type { DeviceInstance } from "@/editor/scene/types";
import {
  getScene,
  resolveScene,
  updateDevice,
  useAssets,
  useEditor,
  useUI,
  type ResolvedDevice,
} from "@/editor/store/editor";
import { useElementSize } from "@/hooks/useElementSize";

const LABEL_SPACE = 28;
const CHECKERBOARD =
  "repeating-conic-gradient(var(--mf-raised) 0% 25%, var(--mf-panel-solid) 0% 50%) 0 0 / 16px 16px";
/** Snap distance in screen pixels. */
const SNAP_PX = 8;

/* Lets the drop handler ask which device is under the pointer. */
let hitTestAt: ((clientX: number, clientY: number) => string | null) | null =
  null;
export function deviceKeyAt(clientX: number, clientY: number) {
  return hitTestAt?.(clientX, clientY) ?? null;
}

type Gesture =
  | {
      kind: "move";
      key: string;
      start: { x: number; y: number };
      origin: { x: number; y: number };
    }
  | { kind: "scale"; key: string; startDist: number; origin: number }
  | { kind: "rotate"; key: string; startAngle: number; origin: number }
  | {
      kind: "pan";
      key: string;
      start: { x: number; y: number };
      origin: { panX: number; panY: number };
    };

export function Stage() {
  const scene = useEditor((s) => s.history.present);
  const images = useAssets((s) => s.images);
  const selectedKey = useUI((s) => s.selectedKey);
  const cropping = useUI((s) => s.cropping);
  const resolved = resolveScene(scene, images);
  const { canvas } = resolved;

  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dragging, setDragging] = useState(false);

  const fit = fitInside(canvas, {
    width: box.width,
    height: Math.max(0, box.height - LABEL_SPACE),
  });
  const view = fit.width / canvas.width;
  const placements = resolved.devices.map((d) =>
    placeDevice(d.geo, canvas, d.instance),
  );
  const selectedIndex = Math.max(
    0,
    resolved.devices.findIndex((d) => d.instance.key === selectedKey),
  );
  const selected = resolved.devices[selectedIndex];
  const selPlace = placements[selectedIndex];

  /* ---------- Drawing ---------- */
  useEffect(() => {
    const el = canvasRef.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || fit.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(fit.width * dpr);
    el.height = Math.round(fit.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    renderScene(ctx, {
      scene,
      resolved,
      pxScale: (fit.width * dpr) / canvas.width,
    });
    // resolved is derived from scene + images, which are already dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, images, fit.width, fit.height, canvas.width]);

  /* ---------- Hit testing ---------- */
  const toCanvas = (clientX: number, clientY: number) => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / view, y: (clientY - r.top) / view };
  };

  const deviceAt = (px: number, py: number): number => {
    for (let i = resolved.devices.length - 1; i >= 0; i--) {
      if (hitDevice(placements[i], resolved.devices[i].geo, px, py)) return i;
    }
    return -1;
  };

  useEffect(() => {
    hitTestAt = (clientX, clientY) => {
      const el = overlayRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (
        clientX < r.left ||
        clientY < r.top ||
        clientX > r.right ||
        clientY > r.bottom
      )
        return null;
      const i = deviceAt((clientX - r.left) / view, (clientY - r.top) / view);
      return i === -1 ? null : resolved.devices[i].instance.key;
    };
    return () => {
      hitTestAt = null;
    };
  });

  /* ---------- Gestures ---------- */
  const startGesture = (e: ReactPointerEvent, g: Gesture) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = g;
    useEditor.getState().beginGesture();
    setDragging(true);
  };

  const onCanvasPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    const i = deviceAt(p.x, p.y);
    const ui = useUI.getState();
    if (i === -1) {
      if (ui.cropping) ui.setCropping(false);
      return;
    }
    const d = resolved.devices[i].instance;
    if (d.key !== ui.selectedKey) ui.select(d.key);
    if (ui.cropping && d.key === ui.selectedKey && d.screenshotId) {
      startGesture(e, {
        kind: "pan",
        key: d.key,
        start: p,
        origin: { panX: d.crop.panX, panY: d.crop.panY },
      });
    } else {
      startGesture(e, {
        kind: "move",
        key: d.key,
        start: p,
        origin: { x: d.x, y: d.y },
      });
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const p = toCanvas(e.clientX, e.clientY);
    const scene = getScene();
    const d = scene.devices.find((x) => x.key === g.key);
    const rd = resolved.devices.find((x) => x.instance.key === g.key);
    if (!d || !rd) return;
    const place = placeDevice(rd.geo, canvas, d);

    const set = (patch: Partial<DeviceInstance>) =>
      useEditor.getState().updateLive((s) => ({
        ...s,
        devices: s.devices.map((x) =>
          x.key === g.key ? { ...x, ...patch } : x,
        ),
      }));

    if (g.kind === "move") {
      const raw = {
        x: g.origin.x + (p.x - g.start.x) / canvas.width,
        y: g.origin.y + (p.y - g.start.y) / canvas.height,
      };
      if (e.shiftKey) {
        setGuides([]);
        set(raw);
      } else {
        const others = scene.devices.filter((x) => x.key !== g.key);
        const snapped = snapPosition(raw.x, raw.y, others, {
          x: SNAP_PX / view / canvas.width,
          y: SNAP_PX / view / canvas.height,
        });
        setGuides(snapped.guides);
        set({ x: snapped.x, y: snapped.y });
      }
    } else if (g.kind === "scale") {
      const dist = Math.hypot(p.x - place.cx, p.y - place.cy);
      set({
        scale: clamp(
          Math.round(((g.origin * dist) / g.startDist) * 100) / 100,
          0.1,
          3,
        ),
      });
    } else if (g.kind === "rotate") {
      const angle =
        (Math.atan2(p.y - place.cy, p.x - place.cx) * 180) / Math.PI;
      set({ rotation: snapAngle(g.origin + angle - g.startAngle, e.shiftKey) });
    } else if (g.kind === "pan" && rd.image) {
      // Work in the device's own axes so panning feels right when it's rotated.
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      const cos = Math.cos(-place.rotation);
      const sin = Math.sin(-place.rotation);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      const screen = {
        width: rd.geo.screen.width * place.scale,
        height: rd.geo.screen.height * place.scale,
      };
      const range = panRange(rd.image, screen, d.crop.zoom);
      set({
        crop: {
          ...d.crop,
          panX:
            range.width > 0
              ? clamp(g.origin.panX - lx / range.width, -1, 1)
              : d.crop.panX,
          panY:
            range.height > 0
              ? clamp(g.origin.panY - ly / range.height, -1, 1)
              : d.crop.panY,
        },
      });
    }
  };

  const endGesture = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setGuides([]);
    setDragging(false);
    useEditor.getState().endGesture();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = toCanvas(e.clientX, e.clientY);
    const i = deviceAt(p.x, p.y);
    if (i === -1) return;
    const d = resolved.devices[i].instance;
    useUI.getState().select(d.key);
    if (d.screenshotId) useUI.getState().setCropping(true);
    else openPicker("screenshot");
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!cropping || !selected?.instance.screenshotId) return;
    const zoom = clamp(
      selected.instance.crop.zoom * Math.exp(-e.deltaY * 0.0015),
      1,
      MAX_ZOOM,
    );
    updateDevice(
      selected.instance.key,
      { crop: { ...selected.instance.crop, zoom } },
      `zoom-${selected.instance.key}`,
    );
  };

  // Scroll-to-zoom needs a non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !cropping) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    return () => el.removeEventListener("wheel", stop);
  }, [cropping]);

  const cursor = dragging
    ? cropping
      ? "grabbing"
      : "move"
    : cropping
      ? "grab"
      : "default";

  return (
    <div ref={boxRef} className="grid h-full w-full place-items-center">
      {fit.width > 0 && (
        <figure className="flex flex-col gap-2" style={{ width: fit.width }}>
          <figcaption className="flex justify-between text-label">
            <span className="font-medium text-muted">{canvas.name}</span>
            <span
              className="font-mono text-faint tabular-nums"
              data-testid="canvas-size"
            >
              {canvas.width} × {canvas.height}
            </span>
          </figcaption>
          <div
            data-testid="canvas"
            className="relative rounded-[6px] shadow-canvas"
            style={{
              width: fit.width,
              height: fit.height,
              background:
                scene.background.kind === "none" ? CHECKERBOARD : undefined,
            }}
          >
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Mockup preview with ${resolved.devices.length} device${resolved.devices.length > 1 ? "s" : ""}`}
              className="absolute inset-0 rounded-[6px]"
              style={{ width: fit.width, height: fit.height }}
            />
            <div
              ref={overlayRef}
              data-testid="stage-overlay"
              className="absolute inset-0 touch-none overflow-hidden rounded-[6px]"
              style={{ cursor }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onDoubleClick={onDoubleClick}
              onWheel={onWheel}
            >
              {resolved.devices.map((d, i) =>
                d.image ? null : (
                  <DropPrompt
                    key={d.instance.key}
                    d={d}
                    place={placements[i]}
                    view={view}
                  />
                ),
              )}
              {guides.map((g) => (
                <div
                  key={`${g.axis}-${g.at}`}
                  aria-hidden
                  className="pointer-events-none absolute bg-accent"
                  style={
                    g.axis === "x"
                      ? { left: g.at * fit.width, top: 0, bottom: 0, width: 1 }
                      : { top: g.at * fit.height, left: 0, right: 0, height: 1 }
                  }
                />
              ))}
            </div>
            {selected && selPlace && (
              <SelectionBox
                place={selPlace}
                view={view}
                cropping={cropping}
                onScale={(e) => {
                  const p = toCanvas(e.clientX, e.clientY);
                  startGesture(e, {
                    kind: "scale",
                    key: selected.instance.key,
                    startDist: Math.max(
                      1,
                      Math.hypot(p.x - selPlace.cx, p.y - selPlace.cy),
                    ),
                    origin: selected.instance.scale,
                  });
                }}
                onRotate={(e) => {
                  const p = toCanvas(e.clientX, e.clientY);
                  startGesture(e, {
                    kind: "rotate",
                    key: selected.instance.key,
                    startAngle:
                      (Math.atan2(p.y - selPlace.cy, p.x - selPlace.cx) * 180) /
                      Math.PI,
                    origin: selected.instance.rotation,
                  });
                }}
                onMove={onPointerMove}
                onEnd={endGesture}
              />
            )}
            {cropping && (
              <div className="pointer-events-none absolute inset-x-0 -top-1 flex -translate-y-full justify-center">
                <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-label font-medium text-on-accent">
                  <CropIcon className="size-3.5" aria-hidden />
                  Drag to reposition · scroll to zoom · Esc when done
                </span>
              </div>
            )}
          </div>
        </figure>
      )}
    </div>
  );
}

function DropPrompt({
  d,
  place,
  view,
}: {
  d: ResolvedDevice;
  place: Placement;
  view: number;
}) {
  const s = d.geo.screen;
  const w = s.width * place.scale * view;
  const h = s.height * place.scale * view;
  // Screen centre relative to the device centre, rotated with the device.
  const ox = (s.x + s.width / 2 - d.geo.width / 2) * place.scale * view;
  const oy = (s.y + s.height / 2 - d.geo.height / 2) * place.scale * view;
  const small = Math.min(w, h) < 120;
  return (
    <div
      data-testid="drop-prompt"
      className="pointer-events-none absolute flex flex-col items-center justify-center gap-1.5 overflow-hidden px-2 text-center text-white/85"
      style={{
        width: w,
        height: h,
        left: place.cx * view - w / 2,
        top: place.cy * view - h / 2,
        transform: `rotate(${place.rotation}rad) translate(${ox}px, ${oy}px)`,
      }}
    >
      {!small && <ImagePlus className="size-5 shrink-0" aria-hidden />}
      {!small && <span className="text-ui font-medium">Drop a screenshot</span>}
      {!small && (
        <span className="font-mono text-label text-white/55 tabular-nums">
          {d.geo.nativeScreen.width} × {d.geo.nativeScreen.height} px
        </span>
      )}
      <button
        type="button"
        className="pointer-events-auto mt-1 rounded-full bg-white/12 px-3 py-1 text-label font-medium transition-colors hover:bg-white/20"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          useUI.getState().select(d.instance.key);
          openPicker("screenshot");
        }}
      >
        {small ? "Add" : "Choose file"}
      </button>
    </div>
  );
}

function SelectionBox({
  place,
  view,
  cropping,
  onScale,
  onRotate,
  onMove,
  onEnd,
}: {
  place: Placement;
  view: number;
  cropping: boolean;
  onScale: (e: ReactPointerEvent) => void;
  onRotate: (e: ReactPointerEvent) => void;
  onMove: (e: ReactPointerEvent) => void;
  onEnd: () => void;
}) {
  const w = place.width * view;
  const h = place.height * view;
  const handle =
    "pointer-events-auto absolute size-2.5 rounded-[3px] border border-accent bg-white shadow-sm -translate-x-1/2 -translate-y-1/2";
  const handlers = {
    onPointerMove: onMove,
    onPointerUp: onEnd,
    onPointerCancel: onEnd,
  };
  return (
    <div
      data-testid="selection"
      aria-hidden
      className={`pointer-events-none absolute rounded-[4px] border-[1.5px] ${cropping ? "border-dashed border-accent" : "border-accent/80"}`}
      style={{
        width: w,
        height: h,
        left: place.cx * view - w / 2,
        top: place.cy * view - h / 2,
        transform: `rotate(${place.rotation}rad)`,
      }}
    >
      {!cropping && (
        <>
          {[
            [0, 0, "nwse-resize"],
            [1, 0, "nesw-resize"],
            [0, 1, "nesw-resize"],
            [1, 1, "nwse-resize"],
          ].map(([fx, fy, cursor]) => (
            <span
              key={`${fx}${fy}`}
              data-testid="scale-handle"
              className={handle}
              style={{
                left: `${(fx as number) * 100}%`,
                top: `${(fy as number) * 100}%`,
                cursor: cursor as string,
              }}
              onPointerDown={onScale}
              {...handlers}
            />
          ))}
          <span className="absolute top-0 left-1/2 h-5 w-px -translate-y-full bg-accent/80" />
          <span
            data-testid="rotate-handle"
            className="pointer-events-auto absolute top-0 left-1/2 grid size-5 -translate-x-1/2 -translate-y-[calc(100%+18px)] cursor-grab place-items-center rounded-full border border-accent bg-white text-accent shadow-sm"
            onPointerDown={onRotate}
            {...handlers}
          >
            <RotateCw className="size-3" />
          </span>
        </>
      )}
    </div>
  );
}
