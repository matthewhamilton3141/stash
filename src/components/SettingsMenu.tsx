import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

interface SettingsMenuProps {
  autostart: boolean;
  onToggleAutostart: () => void;
  onChangeVault: () => void;
  onCheckUpdates: () => void;
  onClose: () => void;
}

export default function SettingsMenu({
  autostart,
  onToggleAutostart,
  onChangeVault,
  onCheckUpdates,
  onClose,
}: SettingsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  // Dismiss on outside click or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Defer so the opening click doesn't immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const pick = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div className="settings-menu" ref={menuRef} role="menu">
      <button className="settings-item" role="menuitem" onClick={pick(onCheckUpdates)}>
        Check for updates…
      </button>
      <button className="settings-item" role="menuitem" onClick={pick(onChangeVault)}>
        Change notes folder…
      </button>

      <div className="settings-sep" />

      <button
        className="settings-item"
        role="menuitemcheckbox"
        aria-checked={autostart}
        onClick={onToggleAutostart}
      >
        <span className="settings-check">{autostart ? "✓" : ""}</span>
        Launch at login
      </button>

      <div className="settings-sep" />

      <div className="settings-version">Stash{version ? ` v${version}` : ""}</div>
    </div>
  );
}
