# Jot

<p align="center">
  <img src="jot.png" width="120" alt="Jot icon" />
</p>

Jot is a menu-bar macOS app for **quick code notes**: press **⌘⇧K** to capture a snippet from anywhere and it's saved as a plain Markdown file you own. It packs syntax highlighting, instant search, tags, reusable `{{templates}}`, and a keyboard-first command palette (**⌘K**) — built with **Tauri 2**, **React + TypeScript**, and **CodeMirror 6**.

## Why

Most snippet managers (SnippetsLab, massCode, Dash…) are *libraries* — foldered, heavy, built for curating collections. Jot optimizes the two moments that actually matter: **capturing** a snippet without breaking flow, and **retrieving** it instantly, keyboard-first.

## Features

- **Files you own** — every note is a plain Markdown file in a folder you choose (YAML frontmatter for metadata + a fenced code block for the snippet). No database, fully local. Point the folder at iCloud/Dropbox/a Git repo and you get cross-device sync with no backend.
- **Syntax highlighting** for 10 languages via CodeMirror 6 (JS/TS, Python, Rust, HTML, CSS, SQL, JSON, Markdown, plain text), with light + dark (VS Code / Cursor) themes.
- **Instant search** — live, case-insensitive, all-terms matching over title/body/tags, kept in memory and keyboard-navigable.
- **Tags** with a filter row (AND-combining), plus per-note tag chips.
- **One-click copy** from the list or editor, with a native clipboard write and copy confirmation.
- **Auto language detection on paste** — paste a snippet into a fresh note and the language is guessed (highlight.js).
- **Snippet templates** — `{{name}}` / `{{name:default}}` placeholders prompt you to fill them in on copy, turning notes into reusable templates.
- **Command palette (⌘K)** — fuzzy-jump to any note or run an action (new, copy, pin, delete, theme, launch-at-login).
- **Pin + "Most used" ordering** — pin favorites to the top; copy usage is tracked so your most-copied snippets can float up.
- **Quick capture** — a global hotkey (**⌘⇧K**) opens a frameless capture window from anywhere; paste, it auto-detects the language, **⌘⏎** saves and dismisses. A **menu-bar tray** offers Open / Quick Capture / Quit, and **launch-at-login** is toggleable.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘F` | Focus search |
| `⌘⇧C` | Copy selected note |
| `⌘⇧K` | Quick capture (global) |
| `↑`/`↓` in search | Move selection · `Enter` opens |
| `⌘⏎` in capture | Save · `Esc` dismisses |

## Stack

- **Tauri 2** (Rust shell) + **React 19 / TypeScript / Vite**
- **CodeMirror 6** editor & highlighting
- **Plain Markdown files** as storage (frontmatter + fenced body), read/written via `tauri-plugin-fs`; folder chosen via `tauri-plugin-dialog`
- Plugins: fs, dialog, clipboard-manager, global-shortcut, autostart

Notes live as `.md` files in your vault folder (default `~/Documents/JotVault`,
changeable from the command palette → "Change notes folder…"). Each file looks like:

```markdown
---
title: Debounce helper
language: javascript
tags: [utils, react]
pinned: true
copies: 12
created: 2026-07-28T09:00:00Z
updated: 2026-07-28T09:12:00Z
id: k3f9a2
---

​```javascript
export function debounce(fn, ms) { /* ... */ }
​```
```

## Develop

```bash
npm install
npm run tauri dev      # run the app
npm run tauri build    # produce a release .app
```

## Project layout

```
src/                     React frontend
  App.tsx                main window (list + editor + search + palette)
  Capture.tsx            quick-capture window
  vault.ts               filesystem layer (read/write .md, folder picker)
  vault-format.ts        pure parse/serialize of frontmatter + fenced body
  languages.ts           language registry + paste detection
  placeholders.ts        {{template}} parsing/filling
  fuzzy.ts               command-palette matching
  components/            Editor, NoteList, SearchBar, TagInput, FillModal, CommandPalette
src-tauri/
  src/lib.rs             plugins, tray, global shortcut
  tauri.conf.json        windows (main + capture), bundle
  capabilities/          permission set
```
