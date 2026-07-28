import type { Extension } from "@codemirror/state";
import hljs from "highlight.js/lib/common";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";

export interface LanguageDef {
  id: string;
  label: string;
  extension: () => Extension;
}

/** Ordered registry of supported languages. `plaintext` is the safe default. */
export const LANGUAGES: LanguageDef[] = [
  { id: "plaintext", label: "Plain text", extension: () => [] },
  { id: "javascript", label: "JavaScript", extension: () => javascript({ jsx: true }) },
  { id: "typescript", label: "TypeScript", extension: () => javascript({ jsx: true, typescript: true }) },
  { id: "python", label: "Python", extension: () => python() },
  { id: "rust", label: "Rust", extension: () => rust() },
  { id: "html", label: "HTML", extension: () => html() },
  { id: "css", label: "CSS", extension: () => css() },
  { id: "sql", label: "SQL", extension: () => sql() },
  { id: "json", label: "JSON", extension: () => json() },
  { id: "markdown", label: "Markdown", extension: () => markdown() },
];

const BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));

export function languageExtension(id: string): Extension {
  return (BY_ID.get(id) ?? LANGUAGES[0]).extension();
}

export function languageLabel(id: string): string {
  return (BY_ID.get(id) ?? LANGUAGES[0]).label;
}

// highlight.js language name -> our language id (only ones we support).
const HLJS_TO_ID: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  rust: "rust",
  xml: "html",
  css: "css",
  scss: "css",
  sql: "sql",
  json: "json",
  markdown: "markdown",
};

const DETECT_SUBSET = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "xml",
  "css",
  "sql",
  "json",
  "markdown",
];

/**
 * Best-effort language detection for a snippet. Returns a supported language id,
 * or null when the guess is weak (so we don't clobber plain prose).
 */
export function detectLanguage(code: string): string | null {
  const trimmed = code.trim();
  if (trimmed.length < 12) return null;
  const res = hljs.highlightAuto(trimmed, DETECT_SUBSET);
  const id = res.language ? HLJS_TO_ID[res.language] : undefined;
  if (!id) return null;
  // Relevance scales with snippet length; require a modest signal.
  if ((res.relevance ?? 0) < 5) return null;
  return id;
}
