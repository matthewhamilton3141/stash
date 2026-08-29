# Handoff: multi-window capture + tray search

Working doc for picking this back up (possibly in a different environment/session).
Delete this file once both features are shipped and merged.

## Plan (in order — build 1, verify, then 2, then maybe 3)

1. **Multi-window quick capture** — `⌘⇧N` always opens a brand-new capture window; `⌘⇧K` keeps its current behavior (toggle show/hide of the existing/most-recent capture window). *Code written, NOT YET VERIFIED — see "Next step" below.*
2. **Tray dropdown search** — `⌘⇧F` (global shortcut, not tied to tray icon click) opens a small popup window that live-filters your existing Stash notes (title/body/tags) and copies the selected one to the clipboard on Enter. Not yet started.
3. **Keybind customization settings** — deferred/optional. Only build if it turns out easy/worthwhile once shortcuts 1 & 2 are real and hardcoded. Don't build speculatively.

## Next step (do this first)

Step 1's code is written but **unverified** — this session's Bash tool got stuck behind a
permission-approval gate (`npm run build` / `cargo check` both returned "This command requires
approval" repeatedly, even after the user said yes in chat, and even with sandbox override). Never
diagnosed; just switch environments and it'll probably work fine.

In the new session/environment:
1. `npm run build` (runs `tsc` then `vite build`) — check for TS errors, especially around
   `src/main.tsx` and `src/Capture.tsx` changes below.
2. `cd src-tauri && cargo check` — check the Rust changes in `lib.rs` compile (new imports:
   `AtomicU32`, `PhysicalPosition`, `WebviewUrl`, `WebviewWindowBuilder`).
3. Run the app for real (`npm run tauri dev` or the `run` skill) and manually verify:
   - `⌘⇧K` still toggles the original singleton capture window (show/hide, not destroyed).
   - `⌘⇧N` opens a **new** capture window each time, cascading position (~24px offset per window,
     wraps every 8).
   - Each `⌘⇧N` window is independently usable (typing, language detect, palette).
   - Saving (⌘⏎) or dismissing (Esc) a `⌘⇧N`-spawned window **closes** it for good (check it's
     gone from window list, not just hidden) — the singleton `capture` window should still just
     hide, not close, on the same actions.
   - "Open in main app" (⌘O) from a `⌘⇧N` window works and the window closes afterward.
   - No console errors about missing permissions/capabilities for the new `capture-N` windows
     (fs read/write, clipboard, window close/show/hide/set-focus) — this exercises the new
     `"capture-*"` glob entry in `capabilities/default.json`.

If all that checks out, step 1 is done — update this doc (delete this "Next step" section, mark
step 1 done) and move to step 2 (tray search).

## Code changes made for step 1 (all uncommitted)

- `src/main.tsx` — window→view selection changed from `label === "capture"` to
  `label.startsWith("capture")`, since new windows get labels `capture-0`, `capture-1`, etc.
- `src/Capture.tsx` — `hide()` now branches: the singleton `"capture"` window still calls
  `.hide()` (unchanged toggle behavior); any other window (i.e. a `capture-N` spawned by ⌘⇧N)
  calls `.close()` instead, so one-shot windows don't pile up hidden in memory.
- `src-tauri/src/lib.rs`:
  - New `new_capture_window(app)` fn: builds a `WebviewWindowBuilder` with label `capture-{n}`
    (n from a module-level `AtomicU32` counter), same visual config as the static `capture`
    window (640x420, no decorations, always-on-top, skip-taskbar), centers it, then nudges
    position by `(n % 8) * 24px` so repeated presses cascade instead of stacking exactly.
  - Registered a second global shortcut, `⌘⇧N` (`Modifiers::SUPER | Modifiers::SHIFT` +
    `Code::KeyN`), calling `new_capture_window`.
  - Tray menu was **not** changed — no new menu item added for "new capture window" (kept scope
    to just the shortcut, per the plan). Revisit if the user wants tray/menu discoverability too.
- `src-tauri/capabilities/default.json`:
  - `"windows"` list extended from `["main", "capture"]` to `["main", "capture", "capture-*"]`
    (Tauri v2 capability window-matching supports glob patterns) so dynamically-created capture
    windows get the same permissions as the static one.
  - Added `"core:window:allow-close"` permission (previously only show/hide/set-focus were
    granted; now needed because `Capture.tsx` calls `.close()` on non-singleton windows).

## Decisions already made (don't re-litigate unless something's actually wrong)

- Dropped a fourth idea, **paste-to-last-app** (auto-simulate ⌘V into whatever app was focused before capture): needs macOS Accessibility permission, user decided it's "not really necessary" despite initial enthusiasm. Not building it.
- Tray search scope = **your Stash notes only**, not an OS-wide/Spotlight-style search. That would need broad system permissions and is out of scope for this "quick code notes" app.
- Tray search trigger = **global keyboard shortcut** (`⌘⇧F`), not a tray-icon left-click. Left-click on the tray icon stays as Quick Capture toggle (existing `toggle_capture` behavior in `src-tauri/src/lib.rs`). Neither the shortcut nor the popup window needs any new macOS permission.
- Proposed default shortcuts (confirm with user if they want different keys): `⌘⇧K` capture toggle (unchanged), `⌘⇧N` new capture window (now implemented), `⌘⇧F` tray search.

## Relevant code for step 2 (tray search), once step 1 is verified

- `src-tauri/src/lib.rs` — tray icon setup, `toggle_capture()`, `new_capture_window()`, global
  shortcut registration. The search popup will need its own window (predefined in
  `tauri.conf.json` like `capture`, or spawned like `capture-N` — pick one and match capability
  permissions) and its own `⌘⇧F` global shortcut registration alongside the two above.
- `src-tauri/tauri.conf.json` — window definitions (`main`, `capture`). A search popup window
  will likely want similar chrome to `capture` (decorations: false, alwaysOnTop, skipTaskbar) but
  smaller and probably not resizable.
- `src-tauri/capabilities/default.json` — will need the search window's label (or glob) added,
  plus `clipboard-manager:allow-write-text` (already present) for copy-on-Enter.
- `src/fuzzy.ts`, `src/components/NoteList.tsx`, `src/components/CommandPalette.tsx` — existing
  search/fuzzy-match/list-rendering logic to reuse for tray search rather than reimplementing.
- `src/vault.ts` — `listNotes()` etc., same data source main app and capture windows already use.
- `src/main.tsx` — will need another branch (e.g. `label === "search"`) to render the new search
  component.

## Work-style reminders (from memory, still applies)

- Ordered milestones: finish + verify one before starting the next. Don't jump ahead.
- Propose non-trivial design decisions and get a nod before implementing (already done for the decisions above — just execute now).
- Flag any new OS permission requirement as a cost before building toward it.
