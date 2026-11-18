import { describe, expect, it } from "vitest";
import { HISTORY_LIMIT, commit, createHistory, redo, undo } from "./history";

describe("history", () => {
  it("undoes and redoes commits in order", () => {
    let h = createHistory(0);
    h = commit(h, 1, undefined, 0);
    h = commit(h, 2, undefined, 0);
    h = undo(h);
    expect(h.present).toBe(1);
    h = undo(h);
    expect(h.present).toBe(0);
    h = redo(h);
    expect(h.present).toBe(1);
  });

  it("merges rapid commits with the same key into one step", () => {
    let h = createHistory(0);
    h = commit(h, 1, "scale", 1000);
    h = commit(h, 2, "scale", 1200);
    h = commit(h, 3, "scale", 1400);
    expect(h.past).toEqual([0]);
    expect(undo(h).present).toBe(0);
  });

  it("starts a new step after a pause or a different key", () => {
    let h = createHistory(0);
    h = commit(h, 1, "scale", 0);
    h = commit(h, 2, "scale", 5000);
    h = commit(h, 3, "glare", 5100);
    expect(h.past).toEqual([0, 1, 2]);
  });

  it("drops redo steps after a new commit", () => {
    let h = commit(createHistory(0), 1);
    h = undo(h);
    h = commit(h, 5);
    expect(h.future).toEqual([]);
    expect(redo(h)).toBe(h);
  });

  it("ignores no-op commits and empty undo", () => {
    const h = createHistory(7);
    expect(commit(h, 7)).toBe(h);
    expect(undo(h)).toBe(h);
  });

  it("caps the number of steps", () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = commit(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});
