import { createHighlighter, type Highlighter } from "shiki";

const SUPPORTED_LANGS = [
  "plaintext",
  "javascript",
  "typescript",
  "json",
  "markdown",
  "css",
  "html",
  "bash",
  "python",
  "rust",
  "sql",
  "yaml",
  "mermaid",
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

export function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...SUPPORTED_LANGS],
    });
  }

  return highlighterPromise;
}

export function normalizeLanguage(language: string | null | undefined): string {
  if (!language) {
    return "plaintext";
  }

  const normalized = language.toLowerCase();
  if (normalized === "js") {
    return "javascript";
  }
  if (normalized === "ts") {
    return "typescript";
  }
  if (normalized === "sh") {
    return "bash";
  }

  return SUPPORTED_LANGS.includes(normalized as (typeof SUPPORTED_LANGS)[number])
    ? normalized
    : "plaintext";
}
