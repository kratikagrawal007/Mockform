"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A compact area that scrolls on its own. The bottom edge fades out while
 * there's more to see, so it's obvious the list continues.
 */
export function ScrollArea({
  maxHeight,
  className = "",
  children,
  testId,
}: {
  maxHeight: number;
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () =>
      setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [children]);

  return (
    <div
      ref={ref}
      data-testid={testId}
      data-at-end={atEnd ? "true" : "false"}
      className={`mf-thin-scroll mf-scroll-fade -mx-1 overflow-y-auto overscroll-contain px-1 py-0.5 ${className}`}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}
