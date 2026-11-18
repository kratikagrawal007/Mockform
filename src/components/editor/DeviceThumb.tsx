"use client";

import { useEffect, useRef } from "react";
import {
  deviceGeometry,
  type DeviceColor,
  type DeviceSpec,
} from "@/editor/devices/catalog";
import { drawDevice } from "@/editor/devices/draw";

/** Small preview of a device, drawn with the same routine as the editor and exports. */
export function DeviceThumb({
  spec,
  color,
  width,
  height,
}: {
  spec: DeviceSpec;
  color: DeviceColor;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const geo = deviceGeometry(spec);
    const s = Math.min(
      (width * 0.86) / geo.width,
      (height * 0.86) / geo.height,
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate((width - geo.width * s) / 2, (height - geo.height * s) / 2);
    ctx.scale(s, s);
    drawDevice(ctx, spec, geo, color, null, false);
  }, [spec, color, width, height]);

  return <canvas ref={ref} aria-hidden style={{ width, height }} />;
}
