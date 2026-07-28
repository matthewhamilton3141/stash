import { load as yamlLoad, dump as yamlDump } from "js-yaml";

/**
 * A note is a single Markdown file: YAML frontmatter for metadata, and the
 * snippet stored as a fenced code block so it renders as code anywhere.
 * This module is pure (no filesystem) so it can be unit-tested.
 */
export interface Note {
  id: string; // stable identity, stored in frontmatter
  path: string; // absolute file path (IO handle)
  title: string;
  body: string;
  language: string;
  tags: string[];
  pinned: boolean;
  copies: number;
  last_copied: number | null;
  created_at: number;
  updated_at: number;
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function slug(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "untitled";
}

export function filenameFor(note: Note): string {
  return `${slug(note.title)}-${note.id}.md`;
}

function longestBacktickRun(s: string): number {
  let max = 0;
  for (const m of s.matchAll(/`+/g)) max = Math.max(max, m[0].length);
  return max;
}

export function serialize(note: Note): string {
  const fm = {
    title: note.title,
    language: note.language,
    tags: note.tags,
    pinned: note.pinned,
    copies: note.copies,
    last_copied: note.last_copied ? new Date(note.last_copied).toISOString() : null,
    created: new Date(note.created_at).toISOString(),
    updated: new Date(note.updated_at).toISOString(),
    id: note.id,
  };
  const front = yamlDump(fm, { lineWidth: -1 }).trimEnd();
  const fence = "`".repeat(Math.max(3, longestBacktickRun(note.body) + 1));
  const lang = note.language === "plaintext" ? "" : note.language;
  return `---\n${front}\n---\n\n${fence}${lang}\n${note.body}\n${fence}\n`;
}

function extractFencedBody(rest: string): string {
  const lines = rest.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const open = lines[i]?.match(/^(`{3,})/);
  if (!open) return rest.trim();
  const fence = open[1];
  const body: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j].trim() === fence) return body.join("\n");
    body.push(lines[j]);
  }
  return body.join("\n"); // no closing fence — take the remainder
}

export function parse(content: string, path: string): Note {
  let fmRaw = "";
  let rest = content;
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    fmRaw = m[1];
    rest = content.slice(m[0].length);
  }
  const fm = (fmRaw ? (yamlLoad(fmRaw) as Record<string, unknown>) : {}) ?? {};
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const date = (v: unknown, d: number) => {
    const t = typeof v === "string" ? Date.parse(v) : NaN;
    return Number.isFinite(t) ? t : d;
  };
  const now = Date.now();
  return {
    id: typeof fm.id === "string" && fm.id ? fm.id : genId(),
    path,
    title: typeof fm.title === "string" ? fm.title : "",
    language: typeof fm.language === "string" ? fm.language : "plaintext",
    tags: Array.isArray(fm.tags) ? fm.tags.map((t) => String(t)) : [],
    pinned: fm.pinned === true,
    copies: num(fm.copies, 0),
    last_copied: fm.last_copied ? date(fm.last_copied, 0) || null : null,
    created_at: date(fm.created, now),
    updated_at: date(fm.updated, now),
    body: extractFencedBody(rest),
  };
}

export function normalizeTags(names: string[]): string[] {
  return Array.from(
    new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))
  );
}
