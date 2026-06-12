import type { MarkdownMatch } from "./markdownPaneSync";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRawFindHighlightHtml(
  markdown: string,
  matches: MarkdownMatch[],
  currentIndex: number,
): string {
  if (!matches.length) {
    return "";
  }

  const validMatches = matches
    .filter(
      (match) =>
        match.start >= 0 &&
        match.end <= markdown.length &&
        match.start < match.end,
    )
    .sort((a, b) => a.start - b.start);

  if (!validMatches.length) {
    return "";
  }

  const currentMatch = matches[currentIndex];
  const parts: string[] = [];
  let cursor = 0;

  validMatches.forEach((match) => {
    if (match.start > cursor) {
      parts.push(escapeHtml(markdown.slice(cursor, match.start)));
    }

    const isCurrent =
      currentMatch !== undefined &&
      match.start === currentMatch.start &&
      match.end === currentMatch.end;
    const className = isCurrent
      ? "raw-find-match raw-find-match--current"
      : "raw-find-match";
    parts.push(
      `<mark class="${className}">${escapeHtml(markdown.slice(match.start, match.end))}</mark>`,
    );
    cursor = match.end;
  });

  if (cursor < markdown.length) {
    parts.push(escapeHtml(markdown.slice(cursor)));
  }

  return parts.join("");
}
