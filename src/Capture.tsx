import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import Editor from "./components/Editor";
import CommandPalette, { type PaletteAction } from "./components/CommandPalette";
import { LANGUAGES, detectLanguage, languageLabel } from "./languages";
import { useTheme } from "./useTheme";
import { useZoom } from "./useZoom";
import { createNote, saveNote, listNotes, type Note } from "./vault";
import "./App.css";

/**
 * The global-hotkey quick-capture surface. Paste code, it auto-detects the
 * language, ⌘⏎ saves and hides. ⌘K opens a palette to jump to notes / run
 * actions. Runs in its own always-hidden window.
 */
export default function Capture() {
  const { theme } = useTheme();
  useZoom();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setBody("");
    setLanguage("plaintext");
  }, []);

  const hide = useCallback(async () => {
    await getCurrentWindow().hide();
  }, []);

  const reloadNotes = useCallback(() => {
    listNotes()
      .then(setNotes)
      .catch(() => {});
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    if (body.trim() === "" && title.trim() === "") {
      await hide();
      return;
    }
    setSaving(true);
    try {
      const note = await createNote();
      await saveNote({ ...note, title, body, language, updated_at: Date.now() });
      await emit("note:created");
      reset();
      await hide();
    } finally {
      setSaving(false);
    }
  }, [saving, body, title, language, reset, hide]);

  // Open in the main app, carrying whatever's already in the capture window.
  const expand = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      let id: string | null = null;
      if (body.trim() !== "" || title.trim() !== "") {
        const note = await createNote();
        await saveNote({ ...note, title, body, language, updated_at: Date.now() });
        id = note.id;
      }
      await emit("note:open", { id });
      reset();
      await hide();
    } finally {
      setSaving(false);
    }
  }, [saving, body, title, language, reset, hide]);

  // Palette: pick an existing note → open it in the main app.
  const openInMain = useCallback(
    async (id: string) => {
      await emit("note:open", { id });
      await hide();
    },
    [hide]
  );

  const paletteActions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      { id: "save", label: "Save note", hint: "⌘⏎", run: save },
      { id: "open", label: "Open in main app", hint: "⌘O", run: expand },
      {
        id: "main",
        label: "Open CodeNote (main window)",
        hint: "Window",
        run: async () => {
          await emit("note:open", { id: null });
          await hide();
        },
      },
    ];
    for (const l of LANGUAGES) {
      list.push({
        id: `lang-${l.id}`,
        label: `Language: ${l.label}`,
        hint: "Set",
        run: () => setLanguage(l.id),
      });
    }
    return list;
  }, [save, expand, hide]);

  // Refocus + refresh notes whenever the window is shown.
  useEffect(() => {
    titleRef.current?.focus();
    reloadNotes();
    const win = getCurrentWindow();
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        titleRef.current?.focus();
        reloadNotes();
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [reloadNotes]);

  const onPaste = useCallback(
    (text: string) => {
      if (language !== "plaintext") return;
      const detected = detectLanguage(text);
      if (detected) setLanguage(detected);
    },
    [language]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (paletteOpen) return; // let the palette handle its own keys
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        save();
      } else if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        expand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hide, save, expand, paletteOpen]);

  return (
    <div className="capture" data-theme={theme}>
      <div className="capture-bar" data-tauri-drag-region>
        <input
          ref={titleRef}
          className="title-input"
          value={title}
          placeholder="Quick note title…"
          onChange={(e) => setTitle(e.target.value)}
        />
        <span className="lang-badge">{languageLabel(language)}</span>
        <button
          className="btn capture-expand"
          onClick={expand}
          title="Open in main app (⌘O)"
        >
          Open in app ↗
        </button>
      </div>
      <div className="capture-editor">
        <Editor value={body} language={language} mode={theme} onChange={setBody} onPaste={onPaste} />
      </div>
      <div className="capture-hint" data-tauri-drag-region>
        <span>
          <kbd>⌘⏎</kbd> save
        </span>
        <span>
          <kbd>⌘K</kbd> palette
        </span>
        <span>
          <kbd>⌘O</kbd> open in app
        </span>
        <span>
          <kbd>esc</kbd> dismiss
        </span>
      </div>

      {paletteOpen && (
        <CommandPalette
          notes={notes}
          actions={paletteActions}
          onOpenNote={openInMain}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
