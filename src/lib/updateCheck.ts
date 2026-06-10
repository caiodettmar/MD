import { APP_VERSION } from "./appVersion";

/** Placeholder until a release endpoint and tauri-plugin-updater are configured. */
export const RELEASES_URL = "https://github.com/caiodettmar/md/releases";

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean | null;
};

/**
 * Manual update check stub. Returns null for latest/updateAvailable when no
 * release server is configured (see docs/release.md).
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  return {
    currentVersion: APP_VERSION,
    latestVersion: null,
    updateAvailable: null,
  };
}

/** Startup hook: logs when enabled; no network until a release endpoint exists. */
export async function runStartupUpdateCheck(enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }

  const result = await checkForUpdates();
  console.info(
    `[MD] Update check (manual-only): v${result.currentVersion}. ` +
      "No release endpoint configured — use Help → Check for Updates when needed.",
  );
}
