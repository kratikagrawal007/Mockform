import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  nextTheme,
  resolveTheme,
  themeBootScript,
} from "./theme";

describe("resolveTheme", () => {
  it("defaults to dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(resolveTheme(null)).toBe("dark");
    expect(resolveTheme(undefined)).toBe("dark");
  });

  it("keeps a valid stored choice", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("ignores junk values", () => {
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme(42)).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("toggles between dark and light", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});

describe("themeBootScript", () => {
  function run(stored: string | null, throws = false) {
    const root = { dataset: {} as Record<string, string> };
    const storage = {
      getItem: () => {
        if (throws) throw new Error("blocked");
        return stored;
      },
    };
    new Function("localStorage", "document", themeBootScript)(storage, {
      documentElement: root,
    });
    return root.dataset.theme;
  }

  it("applies dark on a first visit", () => expect(run(null)).toBe("dark"));
  it("applies a saved light choice", () => expect(run("light")).toBe("light"));
  it("falls back to dark when storage is blocked", () =>
    expect(run(null, true)).toBe("dark"));
});
