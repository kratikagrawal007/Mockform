export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "mockform:theme";
export const DEFAULT_THEME: Theme = "dark";

/** Turns whatever is stored into a valid theme. Anything unknown falls back to dark. */
export function resolveTheme(stored: unknown): Theme {
  return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/**
 * Runs inline in <head> before first paint so the page never flashes
 * the wrong theme. Kept as a string because it executes outside React.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=t==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;
