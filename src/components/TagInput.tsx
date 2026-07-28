import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** Editable chip list for a note's tags. Enter/comma adds, Backspace removes. */
export default function TagInput({ tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const name = draft.trim().toLowerCase();
    setDraft("");
    if (name && !tags.includes(name)) onChange([...tags, name]);
  }

  function remove(name: string) {
    onChange(tags.filter((t) => t !== name));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  }

  return (
    <div className="tag-input">
      {tags.map((t) => (
        <span key={t} className="tag-chip editable">
          #{t}
          <button className="tag-remove" onClick={() => remove(t)} aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-entry"
        value={draft}
        placeholder={tags.length ? "" : "Add tags…"}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
      />
    </div>
  );
}
