export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Key of the last commit, used to merge rapid edits (like dragging a slider) into one step. */
  lastKey: string | null;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 800;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

export function commit<T>(
  h: History<T>,
  next: T,
  key?: string,
  now = Date.now(),
): History<T> {
  if (Object.is(next, h.present)) return h;
  const merge = !!key && key === h.lastKey && now - h.lastAt < COALESCE_MS;
  return {
    past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastKey: key ?? null,
    lastAt: now,
  };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    lastKey: null,
    lastAt: 0,
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    lastKey: null,
    lastAt: 0,
  };
}
