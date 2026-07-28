import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "./components/Editor";
import NoteList from "./components/NoteList";
import SearchBar from "./components/SearchBar";
import TagInput from "./components/TagInput";
import { LANGUAGES, detectLanguage, languageLabel } from "./languages";
import { WELCOME_SNIPPETS, WELCOME_BODIES, isWelcomeNote } from "./welcome";
import { useTheme } from "./useTheme";
import { useZoom } from "./useZoom";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { copyToClipboard } from "./clipboard";
import { runUpdateCheck } from "./updater";
import FillModal from "./components/FillModal";
import CommandPalette, { type PaletteAction } from "./components/CommandPalette";
import PinIcon from "./components/PinIcon";
import {
  hasPlaceholders,
  parsePlaceholders,
  fillPlaceholders,
  type Placeholder,
} from "./placeholders";
import {
  createNote,
  deleteNote,
  listNotes,
  saveNote,
  setVaultPath,
  normalizeTags,
  type Note,
} from "./vault";
import "./App.css";

const SAVE_DEBOUNCE_MS = 500;
const COPIED_FLASH_MS = 1300;

function matchesQuery(note: Note, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = `${note.title}\n${note.body}\n${note.tags.join(" ")}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const [fill, setFill] = useState<{
    note: Note;
    placeholders: Placeholder[];
  } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"recent" | "used">("recent");
  const [autostart, setAutostart] = useState(false);
  const { theme, toggle } = useTheme();
  useZoom();

  // Debounced whole-file save: one pending note at a time.
  const pending = useRef<Note | null>(null);
  const timer = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const copyTimer = useRef<number | null>(null);
  const deleteTimer = useRef<number | null>(null);
  const detectTimer = useRef<number | null>(null);

  const notesById = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(n.id, n);
    return m;
  }, [notes]);

  const selected = useMemo(
    () => (selectedId == null ? null : notesById.get(selectedId) ?? null),
    [notesById, selectedId]
  );

  // Tags present across all notes, with counts, for the filter row.
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes)
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [notes]);

  // Ordered by pin, then sort mode; then narrowed by search text + tag filters.
  const visible = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...notes]
      .filter(
        (n) =>
          matchesQuery(n, tokens) &&
          (activeTags.length === 0 || activeTags.every((t) => n.tags.includes(t)))
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sortMode === "used") {
          if (b.copies !== a.copies) return b.copies - a.copies;
          const bl = b.last_copied ?? 0;
          const al = a.last_copied ?? 0;
          if (bl !== al) return bl - al;
        }
        return b.updated_at - a.updated_at;
      });
  }, [notes, query, activeTags, sortMode]);

  const reload = useCallback(async () => {
    setNotes(await listNotes());
  }, []);

  useEffect(() => {
    listNotes()
      .then((rows) => {
        setNotes(rows);
        setSelectedId(rows[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
    isEnabled().then(setAutostart).catch(() => {});
  }, []);

  // Refresh when the quick-capture window saves a new note.
  useEffect(() => {
    const un = listen("note:created", () => reload());
    return () => {
      un.then((f) => f());
    };
  }, [reload]);

  // Silent update check on launch; tray "Check for Updates…" triggers a manual one.
  useEffect(() => {
    runUpdateCheck(false);
    const un = listen("update:check", () => runUpdateCheck(true));
    return () => {
      un.then((f) => f());
    };
  }, []);

  // "Open in main app" from quick capture: surface the window and open that note.
  useEffect(() => {
    const un = listen<{ id: string | null }>("note:open", async (e) => {
      const win = getCurrentWindow();
      await win.show();
      await win.setFocus();
      const rows = await listNotes();
      setNotes(rows);
      if (e.payload?.id) setSelectedId(e.payload.id);
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const note = pending.current;
    pending.current = null;
    if (note) await saveNote(note);
  }, []);

  // Pick up external edits when the window regains focus (after saving ours).
  useEffect(() => {
    const onFocus = async () => {
      await flush();
      await reload();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [flush, reload]);

  const doCopy = useCallback(async (note: Note, text: string) => {
    await copyToClipboard(text);
    setCopiedId(note.id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedId(null), COPIED_FLASH_MS);
    const updated = { ...note, copies: note.copies + 1, last_copied: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    await saveNote(updated);
  }, []);

  const togglePin = useCallback(async (note: Note) => {
    const updated = { ...note, pinned: !note.pinned };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    await saveNote(updated);
  }, []);

  // Copy a snippet — if it has {{placeholders}}, prompt to fill them first.
  const copyNote = useCallback(
    (note: Note) => {
      if (hasPlaceholders(note.body)) {
        setFill({ note, placeholders: parsePlaceholders(note.body) });
      } else {
        doCopy(note, note.body);
      }
    },
    [doCopy]
  );

  const patchSelected = useCallback(
    (patch: Partial<Note>) => {
      if (!selected) return;
      const base = pending.current?.id === selected.id ? pending.current : selected;
      const updated = { ...base, ...patch, updated_at: Date.now() };
      setNotes((prev) => prev.map((n) => (n.id === selected.id ? updated : n)));
      pending.current = updated;
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [selected, flush]
  );

  const handleSelect = useCallback(
    async (id: string) => {
      await flush();
      setDeleteArmed(false);
      setSelectedId(id);
    },
    [flush]
  );

  const handleNew = useCallback(async () => {
    await flush();
    setQuery("");
    setActiveTags([]);
    const note = await createNote();
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }, [flush]);

  const removeNote = useCallback(async (note: Note) => {
    if (pending.current?.id === note.id) pending.current = null;
    await deleteNote(note);
    setNotes((prev) => {
      const remaining = prev.filter((n) => n.id !== note.id);
      setSelectedId((cur) => (cur === note.id ? remaining[0]?.id ?? null : cur));
      return remaining;
    });
  }, []);

  // Two-step delete: first click arms, second click (within 3s) confirms.
  const handleDelete = useCallback(() => {
    if (!selected) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      deleteTimer.current = window.setTimeout(() => setDeleteArmed(false), 3000);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeleteArmed(false);
    removeNote(selected);
  }, [selected, deleteArmed, removeNote]);

  const handleTags = useCallback(
    async (names: string[]) => {
      if (!selected) return;
      const updated = {
        ...selected,
        tags: normalizeTags(names),
        updated_at: Date.now(),
      };
      setNotes((prev) => prev.map((n) => (n.id === selected.id ? updated : n)));
      await saveNote(updated);
    },
    [selected]
  );

  // Changing the welcome note's language also swaps its body to that language's
  // version — until you edit it, after which it acts like a normal note.
  const changeLanguage = useCallback(
    (language: string) => {
      if (
        selected &&
        isWelcomeNote(selected) &&
        WELCOME_BODIES.has(selected.body) &&
        WELCOME_SNIPPETS[language]
      ) {
        patchSelected({ language, body: WELCOME_SNIPPETS[language] });
      } else {
        patchSelected({ language });
      }
    },
    [selected, patchSelected]
  );

  // Auto-detect language when pasting into a still-untyped (plaintext) note.
  const handlePaste = useCallback(
    (text: string) => {
      if (!selected || selected.language !== "plaintext") return;
      const detected = detectLanguage(text);
      if (!detected || detected === selected.language) return;
      patchSelected({ language: detected });
      setDetectMsg(languageLabel(detected));
      if (detectTimer.current) clearTimeout(detectTimer.current);
      detectTimer.current = window.setTimeout(() => setDetectMsg(null), 2200);
    },
    [selected, patchSelected]
  );

  const toggleTagFilter = useCallback((name: string) => {
    setActiveTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  }, []);

  // Keyboard navigation from the search box.
  const moveSelection = useCallback(
    (dir: 1 | -1) => {
      if (visible.length === 0) return;
      const idx = visible.findIndex((n) => n.id === selectedId);
      const next = Math.min(
        Math.max(idx === -1 ? 0 : idx + dir, 0),
        visible.length - 1
      );
      handleSelect(visible[next].id);
    },
    [visible, selectedId, handleSelect]
  );

  const focusEditor = useCallback(() => {
    (document.querySelector(".cm-editor .cm-content") as HTMLElement | null)?.focus();
  }, []);

  const changeVault = useCallback(async () => {
    const dir = await open({ directory: true, title: "Choose notes folder" });
    if (typeof dir === "string") {
      await setVaultPath(dir);
      await flush();
      const rows = await listNotes();
      setNotes(rows);
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [flush]);

  // Global shortcuts: ⌘K palette, ⌘F search, ⌘⇧C copy selected note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (selected) copyNote(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, copyNote]);

  const paletteActions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      { id: "new", label: "New note", hint: "Create", run: handleNew },
      {
        id: "theme",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        hint: "Appearance",
        run: toggle,
      },
      {
        id: "vault",
        label: "Change notes folder…",
        hint: "Vault",
        run: changeVault,
      },
      {
        id: "autostart",
        label: autostart ? "Disable launch at login" : "Enable launch at login",
        hint: "System",
        run: async () => {
          try {
            if (autostart) {
              await disable();
              setAutostart(false);
            } else {
              await enable();
              setAutostart(true);
            }
          } catch {
            /* ignore */
          }
        },
      },
    ];
    if (selected) {
      list.push({
        id: "copy",
        label: "Copy this snippet",
        hint: "Clipboard",
        run: () => copyNote(selected),
      });
      list.push({
        id: "pin",
        label: selected.pinned ? "Unpin this note" : "Pin this note",
        hint: "Organize",
        run: () => togglePin(selected),
      });
      list.push({
        id: "delete",
        label: "Delete this note",
        hint: "Danger",
        run: () => removeNote(selected),
      });
    }
    return list;
  }, [
    handleNew,
    toggle,
    theme,
    changeVault,
    autostart,
    selected,
    copyNote,
    togglePin,
    removeNote,
  ]);

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <span className="brand">CodeNote</span>
          <div className="header-actions">
            <button
              className="btn icon"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle color theme"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button className="btn primary" onClick={handleNew}>
              + New
            </button>
          </div>
        </header>

        <SearchBar
          value={query}
          onChange={setQuery}
          onArrow={moveSelection}
          onEnter={focusEditor}
          inputRef={searchRef}
        />

        {availableTags.length > 0 && (
          <div className="tag-filter">
            {availableTags.map((t) => (
              <button
                key={t.name}
                className={
                  activeTags.includes(t.name)
                    ? "tag-chip filter active"
                    : "tag-chip filter"
                }
                onClick={() => toggleTagFilter(t.name)}
              >
                #{t.name}
                <span className="tag-count">{t.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="list-controls">
          <button
            className={sortMode === "recent" ? "sort-btn active" : "sort-btn"}
            onClick={() => setSortMode("recent")}
          >
            Recent
          </button>
          <button
            className={sortMode === "used" ? "sort-btn active" : "sort-btn"}
            onClick={() => setSortMode("used")}
          >
            Most used
          </button>
        </div>

        {loading ? (
          <div className="list-empty">Loading…</div>
        ) : (
          <NoteList
            notes={visible}
            selectedId={selectedId}
            copiedId={copiedId}
            filtered={query.trim() !== "" || activeTags.length > 0}
            onSelect={handleSelect}
            onCopy={copyNote}
          />
        )}
      </aside>

      <main className="editor-pane">
        {selected ? (
          <>
            <div className="editor-toolbar">
              <input
                className="title-input"
                value={selected.title}
                placeholder="Untitled"
                onChange={(e) => patchSelected({ title: e.target.value })}
              />
              <select
                className="lang-select"
                value={selected.language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              {detectMsg && <span className="detect-flash">✨ {detectMsg}</span>}
              <button
                className={selected.pinned ? "btn icon pinned" : "btn icon"}
                onClick={() => togglePin(selected)}
                title={selected.pinned ? "Unpin" : "Pin to top"}
              >
                <PinIcon filled={selected.pinned} />
              </button>
              <button
                className="btn"
                onClick={() => copyNote(selected)}
                title="Copy snippet (⌘⇧C)"
              >
                {copiedId === selected.id ? "Copied ✓" : "Copy"}
              </button>
              <button
                className={deleteArmed ? "btn danger armed" : "btn danger"}
                onClick={handleDelete}
              >
                {deleteArmed ? "Confirm?" : "Delete"}
              </button>
            </div>
            <TagInput tags={selected.tags} onChange={handleTags} />
            <div className="editor-host">
              <Editor
                key={selected.id}
                value={selected.body}
                language={selected.language}
                mode={theme}
                onChange={(body) => patchSelected({ body })}
                onPaste={handlePaste}
              />
            </div>
          </>
        ) : (
          <div className="editor-empty">
            <p>Select a note, or create a new one.</p>
          </div>
        )}
      </main>

      {fill && (
        <FillModal
          placeholders={fill.placeholders}
          onCancel={() => setFill(null)}
          onSubmit={(values) => {
            const text = fillPlaceholders(fill.note.body, values);
            doCopy(fill.note, text);
            setFill(null);
          }}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          notes={notes}
          actions={paletteActions}
          onOpenNote={handleSelect}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
