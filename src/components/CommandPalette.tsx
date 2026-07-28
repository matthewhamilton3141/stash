import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Note } from "../vault";
import { languageLabel } from "../languages";
import { fuzzyScore } from "../fuzzy";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  notes: Note[];
  actions: PaletteAction[];
  onOpenNote: (id: string) => void;
  onClose: () => void;
}

interface Item {
  key: string;
  label: string;
  sub: string;
  score: number;
  isAction: boolean;
  run: () => void;
}

function noteSubtitle(note: Note): string {
  const line = note.body.split("\n").find((l) => l.trim().length > 0)?.trim();
  return line ? `${languageLabel(note.language)} · ${line}` : languageLabel(note.language);
}

export default function CommandPalette({
  notes,
  actions,
  onOpenNote,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const acts: Item[] = actions
      .map((a) => ({
        key: `a:${a.id}`,
        label: a.label,
        sub: a.hint ?? "Action",
        score: q === "" ? 1000 : fuzzyScore(q, a.label) + 6,
        isAction: true,
        run: () => {
          a.run();
          onClose();
        },
      }))
      .filter((i) => q === "" || i.score >= 6);

    const noteItems: Item[] = notes
      .map((n) => {
        const title = n.title.trim() || "Untitled";
        const hay = `${title} ${n.tags.join(" ")} ${n.body.slice(0, 200)}`;
        return {
          key: `n:${n.id}`,
          label: title,
          sub: noteSubtitle(n),
          score: q === "" ? 0 : fuzzyScore(q, hay),
          isAction: false,
          run: () => {
            onOpenNote(n.id);
            onClose();
          },
        };
      })
      .filter((i) => q === "" || i.score >= 0);

    const merged = [...acts, ...noteItems];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, 50);
  }, [query, notes, actions, onOpenNote, onClose]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          placeholder="Jump to a note or run a command…"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        <ul className="palette-list" ref={listRef}>
          {items.length === 0 && <li className="palette-empty">No results</li>}
          {items.map((item, i) => (
            <li
              key={item.key}
              className={i === active ? "palette-item active" : "palette-item"}
              onMouseEnter={() => setActive(i)}
              onClick={item.run}
            >
              <span className={item.isAction ? "palette-kind action" : "palette-kind"}>
                {item.isAction ? "▶" : "❯"}
              </span>
              <span className="palette-label">{item.label}</span>
              <span className="palette-sub">{item.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
