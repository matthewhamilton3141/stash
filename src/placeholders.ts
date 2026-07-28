/**
 * Template placeholders let a snippet act as a reusable template.
 * Syntax: {{name}} or {{name:default value}}.
 * Chosen over ${...}/$VAR to avoid colliding with shell/JS code.
 */

export interface Placeholder {
  name: string;
  default: string;
}

const PATTERN = /\{\{\s*([a-zA-Z0-9_.\- ]+?)\s*(?::\s*([^}]*?))?\s*\}\}/g;

/** Unique placeholders in the given text, in first-seen order. */
export function parsePlaceholders(text: string): Placeholder[] {
  const seen = new Map<string, Placeholder>();
  for (const m of text.matchAll(PATTERN)) {
    const name = m[1].trim();
    if (!seen.has(name)) seen.set(name, { name, default: (m[2] ?? "").trim() });
  }
  return [...seen.values()];
}

export function hasPlaceholders(text: string): boolean {
  PATTERN.lastIndex = 0;
  return PATTERN.test(text);
}

/** Replace every {{name}} / {{name:default}} with the provided value. */
export function fillPlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(PATTERN, (_all, rawName: string) => {
    const name = rawName.trim();
    return values[name] ?? "";
  });
}
