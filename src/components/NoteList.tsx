import type { Note } from "../vault";
import { languageLabel } from "../languages";
import { formatRelative } from "../time";
import PinIcon from "./PinIcon";

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  copiedId: string | null;
  filtered: boolean;
  onSelect: (id: string) => void;
  onCopy: (note: Note) => void;
}

function preview(note: Note): string {
  const firstLine = note.body.split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim() ?? "Empty snippet";
}

export default function NoteList({
  notes,
  selectedId,
  copiedId,
  filtered,
  onSelect,
  onCopy,
}: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="list-empty">
        {filtered ? "No matching notes." : "No notes yet — hit + New to start."}
      </div>
    );
  }

  return (
    <ul className="note-list">
      {notes.map((note) => (
        <li
          key={note.id}
          className={note.id === selectedId ? "note-item selected" : "note-item"}
          onClick={() => onSelect(note.id)}
        >
          <div className="note-item-row">
            {note.pinned ? (
              <span className="pin-dot" title="Pinned">
                <PinIcon filled size={11} />
              </span>
            ) : null}
            <span className="note-item-title">{note.title.trim() || "Untitled"}</span>
            <span className="note-item-time">{formatRelative(note.updated_at)}</span>
          </div>
          <div className="note-item-preview">{preview(note)}</div>
          <div className="note-item-meta">
            <span className="lang-badge">{languageLabel(note.language)}</span>
            {note.tags.map((t) => (
              <span key={t} className="tag-chip">
                #{t}
              </span>
            ))}
          </div>
          <button
            className="note-copy-btn"
            title="Copy snippet"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(note);
            }}
          >
            {copiedId === note.id ? "Copied ✓" : "Copy"}
          </button>
        </li>
      ))}
    </ul>
  );
}
