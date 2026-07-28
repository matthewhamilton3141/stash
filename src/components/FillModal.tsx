import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Placeholder } from "../placeholders";

interface FillModalProps {
  placeholders: Placeholder[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

/** Prompt for each template variable before copying a snippet. */
export default function FillModal({ placeholders, onSubmit, onCancel }: FillModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(placeholders.map((p) => [p.name, p.default]))
  );
  const firstRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstRef.current?.focus();
    firstRef.current?.select();
  }, []);

  function submit() {
    onSubmit(values);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || placeholders.length === 1)) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal fill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Fill in template</div>
        {placeholders.map((p, i) => (
          <label key={p.name} className="fill-field">
            <span className="fill-name">{p.name}</span>
            <input
              ref={i === 0 ? firstRef : undefined}
              className="fill-input"
              value={values[p.name] ?? ""}
              placeholder={p.default || p.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, [p.name]: e.target.value }))
              }
              onKeyDown={handleKey}
            />
          </label>
        ))}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit}>
            Copy ⏎
          </button>
        </div>
      </div>
    </div>
  );
}
