import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

const KEY = "codenote-zoom";
const MIN = 0.6;
const MAX = 2.2;
const STEP = 0.1;

function clamp(z: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));
}

/** ⌘+/⌘- to zoom the window, ⌘0 to reset. Persisted across launches. */
export function useZoom() {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem(KEY) ?? "1");
    return Number.isFinite(saved) ? clamp(saved) : 1;
  });

  useEffect(() => {
    getCurrentWebview()
      .setZoom(zoom)
      .catch(() => {});
    localStorage.setItem(KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => clamp(z + STEP));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clamp(z - STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { zoom };
}
