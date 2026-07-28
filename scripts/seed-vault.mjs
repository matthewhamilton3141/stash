// Seed a CodeNote vault with the pinned welcome note. Its language is
// switchable in-app (the top-right dropdown swaps the body per language).
//
//   node --experimental-strip-types scripts/seed-vault.mjs [vaultDir]
//
// Idempotent: rewrites the welcome note and clears old seed files; leaves
// any notes you've created yourself alone.
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { serialize } from "../src/vault-format.ts";
import {
  WELCOME_ID,
  WELCOME_DEFAULT_LANGUAGE,
  WELCOME_SNIPPETS,
} from "../src/welcome.ts";

const vault = process.argv[2] || join(homedir(), "Documents", "CodeNoteVault");

await mkdir(vault, { recursive: true });

// Clean up prior seeds (the per-language experiment and any old welcome file).
for (const f of await readdir(vault)) {
  if (/-seed-[a-z]+\.md$/.test(f) || /-welcome1?\.md$/.test(f)) {
    await unlink(join(vault, f));
  }
}

const now = Date.now();
const note = {
  id: WELCOME_ID,
  path: "",
  title: "Welcome to CodeNote",
  body: WELCOME_SNIPPETS[WELCOME_DEFAULT_LANGUAGE],
  language: WELCOME_DEFAULT_LANGUAGE,
  tags: ["welcome"],
  pinned: true,
  copies: 0,
  last_copied: null,
  created_at: now,
  updated_at: now,
};

await writeFile(
  join(vault, `welcome-to-codenote-${WELCOME_ID}.md`),
  serialize(note),
  "utf8"
);

console.log(`Seeded the welcome note into ${vault}`);
