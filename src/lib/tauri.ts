import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  AppConfig,
  FilePayload,
  SessionState,
  WriteResult,
} from "../types";

export async function readMarkdownFile(path: string): Promise<FilePayload> {
  return invoke<FilePayload>("read_markdown_file", { path });
}

export async function writeMarkdownFile(
  path: string,
  content: string,
): Promise<WriteResult> {
  return invoke<WriteResult>("write_markdown_file", { path, content });
}

export async function loadConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("load_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke("save_config", { config });
}

export async function loadSession(): Promise<SessionState | null> {
  return invoke<SessionState | null>("load_session");
}

export async function saveSession(session: SessionState): Promise<void> {
  return invoke("save_session", { session });
}

export async function getStorageInfo(): Promise<string> {
  return invoke<string>("get_storage_info");
}

export async function pickOpenMarkdownPath(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Markdown",
        extensions: ["md", "markdown"],
      },
    ],
  });

  if (selected === null) {
    return null;
  }

  return Array.isArray(selected) ? selected[0] ?? null : selected;
}

export async function pickImageFilePath(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"],
      },
    ],
  });

  if (selected === null) {
    return null;
  }

  return Array.isArray(selected) ? selected[0] ?? null : selected;
}

export async function pickSaveMarkdownPath(
  defaultPath?: string,
): Promise<string | null> {
  const selected = await save({
    filters: [
      {
        name: "Markdown",
        extensions: ["md"],
      },
    ],
    defaultPath,
  });

  return selected;
}
