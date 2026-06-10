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

function normalizePathForCompare(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function splitPathSegments(path: string): string[] {
  return path.replace(/\\/g, "/").split("/").filter(Boolean);
}

function resolveRelativePath(relativePath: string, baseDir: string): string {
  const separator = baseDir.includes("\\") ? "\\" : "/";
  const baseParts = splitPathSegments(baseDir.replace(/[\\/]+$/, ""));
  const relativeParts = splitPathSegments(relativePath);

  for (const part of relativeParts) {
    if (part === ".") {
      continue;
    }

    if (part === "..") {
      if (baseParts.length > 0) {
        baseParts.pop();
      }
      continue;
    }

    baseParts.push(part);
  }

  if (baseParts.length === 0) {
    return relativePath;
  }

  if (/^[a-zA-Z]:$/i.test(baseParts[0] ?? "")) {
    const drive = baseParts.shift() ?? "";
    return `${drive}${separator}${baseParts.join(separator)}`;
  }

  return baseParts.join(separator);
}

function formatMarkdownPath(path: string, documentPath: string | null): string {
  let result = path.trim();
  if (!result) {
    return result;
  }

  if (documentPath && isAbsolutePath(result)) {
    const relative = toRelativeImagePath(result, documentPath);
    if (relative) {
      result = relative;
    }
  }

  return result.replace(/\\/g, "/");
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

  return resolveRelativePath(trimmed, directory);
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
  return relative ? formatMarkdownPath(relative, null) : null;
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
    return formatMarkdownPath(trimmedMarkdown, documentPath);
  }

  const fromAsset = assetUrlToFilePath(trimmedDisplay);
  if (fromAsset) {
    return formatMarkdownPath(fromAsset, documentPath);
  }

  if (trimmedMarkdown && !isAssetImageSrc(trimmedMarkdown)) {
    return formatMarkdownPath(trimmedMarkdown, documentPath);
  }

  if (trimmedMarkdown) {
    return formatMarkdownPath(trimmedMarkdown, documentPath);
  }

  return formatMarkdownPath(trimmedDisplay, documentPath);
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
  if (!documentPath && !isAbsolutePath(resolved)) {
    return trimmed;
  }

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
