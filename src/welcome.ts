/**
 * The welcome note is special: changing its language (top-right dropdown)
 * swaps its body to the matching version below — a live tour of the
 * highlighting. This stays true only until you edit the body, after which
 * it behaves like any normal note.
 */
export const WELCOME_ID = "welcome";
export const WELCOME_DEFAULT_LANGUAGE = "markdown";

export const WELCOME_SNIPPETS: Record<string, string> = {
  markdown: [
    "# Welcome to Jot 👋",
    "",
    "Quick notes for code you'll want again — plain Markdown files you own.",
    "**Switch the language dropdown above ↗** to see this note in each language.",
    "",
    "## Shortcuts",
    "- ⌘K — command palette",
    "- ⌘F — search",
    "- ⌘⇧C — copy the selected snippet",
    "- ⌘⇧K — quick capture from anywhere",
  ].join("\n"),

  plaintext: [
    "Welcome to Jot",
    "",
    "Switch the language dropdown above to see this note in each language.",
    "",
    "Shortcuts:",
    "  ⌘K   command palette",
    "  ⌘F   search",
    "  ⌘⇧C  copy snippet",
    "  ⌘⇧K  quick capture",
  ].join("\n"),

  javascript: [
    "// 👋 Switch the language dropdown above to view this in other languages.",
    'const shortcuts = { palette: "⌘K", capture: "⌘⇧K", copy: "⌘⇧C" };',
    "for (const [what, keys] of Object.entries(shortcuts)) {",
    "  console.log(`${keys} → ${what}`);",
    "}",
  ].join("\n"),

  typescript: [
    "// 👋 Switch the language dropdown above to view this in other languages.",
    "type Tip = { keys: string; does: string };",
    "const tips: Tip[] = [",
    '  { keys: "⌘K", does: "command palette" },',
    '  { keys: "⌘⇧K", does: "quick capture" },',
    "];",
    "tips.forEach((t) => console.log(`${t.keys} → ${t.does}`));",
  ].join("\n"),

  python: [
    "# 👋 Switch the language dropdown above to view this in other languages.",
    'tips = {"⌘K": "command palette", "⌘⇧K": "quick capture", "⌘⇧C": "copy"}',
    "for keys, does in tips.items():",
    '    print(f"{keys} → {does}")',
  ].join("\n"),

  rust: [
    "// 👋 Switch the language dropdown above to view this in other languages.",
    "fn main() {",
    '    let tips = [("⌘K", "command palette"), ("⌘⇧K", "quick capture")];',
    "    for (keys, does) in tips {",
    '        println!("{keys} → {does}");',
    "    }",
    "}",
  ].join("\n"),

  html: [
    "<!-- 👋 Switch the language dropdown above to view this in other languages. -->",
    '<main class="welcome">',
    "  <h1>Welcome to Jot</h1>",
    "  <p>Press <kbd>⌘K</kbd> for the command palette.</p>",
    "  <p>Press <kbd>⌘⇧K</kbd> to capture from anywhere.</p>",
    "</main>",
  ].join("\n"),

  css: [
    "/* 👋 Switch the language dropdown above to view this in other languages. */",
    ".welcome {",
    "  display: grid;",
    "  place-items: center;",
    "  min-height: 100vh;",
    "}",
  ].join("\n"),

  sql: [
    "-- 👋 Switch the language dropdown above to view this in other languages.",
    "SELECT '⌘K' AS keys, 'command palette' AS does",
    "UNION ALL",
    "SELECT '⌘⇧K', 'quick capture';",
  ].join("\n"),

  json: [
    "{",
    '  "welcome": "Switch the language dropdown above to see other languages",',
    '  "shortcuts": { "palette": "⌘K", "capture": "⌘⇧K", "copy": "⌘⇧C" }',
    "}",
  ].join("\n"),
};

/** All welcome bodies, to detect whether the note is still unmodified. */
export const WELCOME_BODIES = new Set(Object.values(WELCOME_SNIPPETS));

export function isWelcomeNote(note: { id: string }): boolean {
  return note.id === WELCOME_ID;
}
