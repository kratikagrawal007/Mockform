"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/IconButton";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  nextTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";

// The <html data-theme> attribute (set before paint by the boot script) is the source of truth.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  resolveTheme(document.documentElement.dataset.theme);
const getServerSnapshot = (): Theme => DEFAULT_THEME;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = nextTheme(theme);

  function toggle() {
    document.documentElement.dataset.theme = target;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, target);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this visit only.
    }
  }

  return (
    <IconButton label={`Switch to ${target} theme`} onClick={toggle}>
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </IconButton>
  );
}
