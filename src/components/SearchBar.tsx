import type { KeyboardEvent, RefObject } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onArrow: (dir: 1 | -1) => void;
  onEnter: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export default function SearchBar({
  value,
  onChange,
  onArrow,
  onEnter,
  inputRef,
}: SearchBarProps) {
  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onArrow(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onArrow(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Escape") {
      onChange("");
    }
  }

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        className="search-input"
        value={value}
        placeholder="Search notes…  (⌘F)"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange("")} title="Clear">
          ×
        </button>
      )}
    </div>
  );
}
