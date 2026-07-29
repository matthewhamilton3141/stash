import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";

/**
 * Check GitHub Releases for a newer, signature-verified build.
 * `manual` = triggered from the tray (show "up to date" / errors);
 * otherwise it's the silent check on launch.
 */
export async function runUpdateCheck(manual: boolean): Promise<void> {
  try {
    const update = await check();
    if (update) {
      const yes = await ask(
        `Jot ${update.version} is available (you have ${update.currentVersion}).\n\nDownload and install now?`,
        { title: "Update available", kind: "info" }
      );
      if (yes) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } else if (manual) {
      await message("You’re on the latest version.", {
        title: "Jot",
        kind: "info",
      });
    }
  } catch (err) {
    // Network hiccups / no release yet are silent unless the user asked.
    if (manual) {
      await message(`Update check failed:\n${err}`, {
        title: "Jot",
        kind: "error",
      });
    }
  }
}
