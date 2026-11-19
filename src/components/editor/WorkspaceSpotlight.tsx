"use client";

import { useEffect, useRef } from "react";

/**
 * A soft light that follows the mouse over the empty workspace and brightens
 * the nearby grid dots. It sits behind the panels and canvas, never takes
 * clicks, and updates through CSS variables so React doesn't re-render.
 */
export function WorkspaceSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    let frame = 0;

    const move = (e: PointerEvent) => {
      // Touch has no hover, so there's nothing to follow.
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.dataset.active = "true";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.dataset.active = "false";
    };

    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="workspace-spotlight"
      data-active="false"
      className="mf-spotlight pointer-events-none absolute inset-0"
    />
  );
}
