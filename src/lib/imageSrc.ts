import { convertFileSrc } from "@tauri-apps/api/core";

const REMOTE_SRC_PATTERN = /^(https?:|data:|blob:|asset:|\/\/)/i;
const ASSET_URL_PATTERN = /^asset:\/\/|https?:\/\/asset\.localhost/i;

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isRemoteImageSrc(src: string): boolean {
  return REMOTE_SRC_PATTERN.test(src.trim());
}

export function isAssetImageSrc(src: string): boolean {
  return ASSET_URL_PATTERN.test(src.trim());
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

function normalizePathForCompare(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
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

export function assetUrlToFilePath(src: string): string | null {
  const trimmed = src.trim();
  if (!isAssetImageSrc(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    let path = decodeURIComponent(url.pathname);
    if (/^\/[a-zA-Z]:/.test(path)) {
      path = path.slice(1);
    }
    return path;
  } catch {
    return null;
  }
}

export function toRelativeImagePath(
  absolutePath: string,
  documentPath: string | null,
): string | null {
  if (!documentPath) {
    return null;
  }

  const directory = documentPath.replace(/[\\/][^\\/]+$/, "");
  if (!directory) {
    return null;
  }

  const normDir = normalizePathForCompare(directory);
  const normAbs = normalizePathForCompare(absolutePath);
  if (!normAbs.startsWith(`${normDir}/`) && normAbs !== normDir) {
    return null;
  }

  const relative = absolutePath
    .slice(directory.length)
    .replace(/^[\\/]+/, "");
  return relative || null;
}

export function normalizeMarkdownImageSrc(
  displaySrc: string,
  markdownSrc: string | null | undefined,
  documentPath: string | null,
): string {
  const trimmedDisplay = displaySrc.trim();
  const trimmedMarkdown =
    typeof markdownSrc === "string" ? markdownSrc.trim() : "";

  if (
    trimmedMarkdown &&
    !isAssetImageSrc(trimmedMarkdown) &&
    !isRemoteImageSrc(trimmedMarkdown)
  ) {
    return trimmedMarkdown;
  }

  if (trimmedMarkdown && !isAssetImageSrc(trimmedMarkdown)) {
    return trimmedMarkdown;
  }

  const fromAsset = assetUrlToFilePath(trimmedDisplay);
  if (fromAsset) {
    const relative = toRelativeImagePath(fromAsset, documentPath);
    return relative ?? fromAsset;
  }

  if (trimmedMarkdown) {
    return trimmedMarkdown;
  }

  return trimmedDisplay;
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
  documentPath: string | null = null,
): string {
  return normalizeMarkdownImageSrc(src, markdownSrc, documentPath);
}

export function buildImageNodeAttrs(
  rawSrc: string,
  documentPath: string | null,
  extras: { alt?: string | null; title?: string | null } = {},
): {
  src: string;
  markdownSrc: string;
  alt: string | null;
  title: string | null;
} {
  const markdownSrc = normalizeMarkdownImageSrc(rawSrc, rawSrc, documentPath);
  return {
    src: toDisplayImageSrc(markdownSrc, documentPath),
    markdownSrc,
    alt: extras.alt ?? null,
    title: extras.title ?? null,
  };
}
