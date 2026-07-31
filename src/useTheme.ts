import { useCallback, useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "stash-theme";
const THEME_EVENT = "theme:changed";

function initialTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/** App-wide light/dark mode, persisted and reflected on <html data-theme>. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Each window (main + quick capture) is its own webview; keep them in sync
  // so a toggle in one is reflected in the other.
  useEffect(() => {
    const un = listen<ThemeMode>(THEME_EVENT, (e) => {
      if (e.payload === "light" || e.payload === "dark") setTheme(e.payload);
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      emit(THEME_EVENT, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
