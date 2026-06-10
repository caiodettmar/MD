import { convertFileSrc } from "@tauri-apps/api/core";

const REMOTE_SRC_PATTERN = /^(https?:|data:|blob:|asset:|\/\/)/i;
const ASSET_URL_PATTERN = /^asset:\/\/|https?:\/\/asset\.localhost/i;

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isRemoteImageSrc(src: string): boolean {
  return REMOTE_SRC_PATTERN.test(src.trim());
}

function isAbsolutePath(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(path);
}

function joinPath(baseDir: string, relativePath: string): string {
  const separator = baseDir.includes("\\") ? "\\" : "/";
  const normalizedBase = baseDir.replace(/[\\/]+$/, "");
  const normalizedRelative = relativePath.replace(/^[\\/]+/, "");
  return `${normalizedBase}${separator}${normalizedRelative}`;
}

export function resolveImagePath(src: string, documentPath: string | null): string {
  const trimmed = src.trim();
  if (!trimmed || isRemoteImageSrc(trimmed) || isAbsolutePath(trimmed)) {
    return trimmed;
  }

  if (!documentPath) {
    return trimmed;
  }

  const directory = documentPath.replace(/[\\/][^\\/]+$/, "");
  if (!directory) {
    return trimmed;
  }

  return joinPath(directory, trimmed);
}

export function toDisplayImageSrc(
  src: string,
  documentPath: string | null,
): string {
  const trimmed = src.trim();
  if (!trimmed || isRemoteImageSrc(trimmed)) {
    return trimmed;
  }

  if (ASSET_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const resolved = resolveImagePath(trimmed, documentPath);
  if (isTauriRuntime()) {
    return convertFileSrc(resolved);
  }

  return resolved;
}

export function toMarkdownImageSrc(
  src: string,
  markdownSrc: string | null | undefined,
): string {
  if (typeof markdownSrc === "string" && markdownSrc.trim()) {
    return markdownSrc.trim();
  }

  return src.trim();
}
