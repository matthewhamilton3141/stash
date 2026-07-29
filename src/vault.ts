import {
  readDir,
  readTextFile,
  writeTextFile,
  mkdir,
  remove,
  exists,
} from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import {
  parse,
  serialize,
  filenameFor,
  genId,
  type Note,
} from "./vault-format";

export type { Note } from "./vault-format";
export { serialize, parse, normalizeTags } from "./vault-format";

// Bumped from "stash-vault-dir": the default now lives in the app's own data
// dir (not ~/Documents), so macOS never prompts for Documents access.
const VAULT_KEY = "stash-vault";
let cachedVault: string | null = null;

/** Ensure a vault folder is configured and exists; returns its path. */
export async function initVault(): Promise<string> {
  let path = localStorage.getItem(VAULT_KEY);
  if (!path) {
    // ~/Library/Application Support/com.matthew.stash/vault — not a TCC-protected
    // location, so there's no permission prompt. Users can point it anywhere
    // (incl. iCloud/Documents) via "Change notes folder…", which grants access
    // through the file picker with no recurring prompts.
    path = await join(await appLocalDataDir(), "vault");
    localStorage.setItem(VAULT_KEY, path);
  }
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
  cachedVault = path;
  return path;
}

export function getVaultPath(): string {
  return cachedVault ?? localStorage.getItem(VAULT_KEY) ?? "";
}

export async function setVaultPath(path: string): Promise<void> {
  localStorage.setItem(VAULT_KEY, path);
  cachedVault = path;
  if (!(await exists(path))) await mkdir(path, { recursive: true });
}

export async function listNotes(): Promise<Note[]> {
  const dir = await initVault();
  const entries = await readDir(dir);
  const notes: Note[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".md")) continue;
    const path = await join(dir, e.name);
    try {
      notes.push(parse(await readTextFile(path), path));
    } catch {
      /* skip unreadable/broken file */
    }
  }
  return notes;
}

export async function createNote(): Promise<Note> {
  const dir = await initVault();
  const now = Date.now();
  const note: Note = {
    id: genId(),
    path: "",
    title: "",
    body: "",
    language: "plaintext",
    tags: [],
    pinned: false,
    copies: 0,
    last_copied: null,
    created_at: now,
    updated_at: now,
  };
  note.path = await join(dir, filenameFor(note));
  await writeTextFile(note.path, serialize(note));
  return note;
}

/** Write the whole note to its file. Used for every mutation. */
export async function saveNote(note: Note): Promise<void> {
  await writeTextFile(note.path, serialize(note));
}

export async function deleteNote(note: Note): Promise<void> {
  await remove(note.path);
}
