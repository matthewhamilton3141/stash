import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/** Copy text to the system clipboard, falling back to the web API. */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await writeText(text);
  } catch {
    await navigator.clipboard.writeText(text);
  }
}
