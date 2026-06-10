export type ThemeMode = "system" | "light" | "dark";
export type EmojiSaveMode = "unicode" | "shortcode";
export type SaveStatus = "saved" | "saving" | "dirty" | "error";

export interface AppConfig {
  restoreSession: boolean;
  theme: ThemeMode;
  fontSize: number;
  wordWrap: boolean;
  editorZoom: number;
  emojiSaveMode: EmojiSaveMode;
  showRawOnStartup: boolean;
  autoSaveMs: number;
  checkUpdates: boolean;
}

export interface TabDocument {
  id: string;
  path: string | null;
  title: string;
  markdown: string;
  dirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
}

export interface FilePayload {
  path: string;
  content: string;
  encoding: string;
}

export interface WriteResult {
  path: string;
  savedAt: string;
}

export interface SessionState {
  tabs: Array<{
    id: string;
    path: string | null;
    title: string;
    markdown: string;
    dirty: boolean;
  }>;
  activeTabId: string | null;
  savedAt: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  restoreSession: true,
  theme: "system",
  fontSize: 100,
  wordWrap: true,
  editorZoom: 100,
  emojiSaveMode: "unicode",
  showRawOnStartup: false,
  autoSaveMs: 2000,
  checkUpdates: true,
};

export function fileNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? path;
}

export function untitledName(existing: TabDocument[]): string {
  const used = new Set(
    existing
      .filter((tab) => !tab.path)
      .map((tab) => tab.title),
  );
  let index = 1;
  while (used.has(`Untitled-${index}.md`)) {
    index += 1;
  }
  return `Untitled-${index}.md`;
}
