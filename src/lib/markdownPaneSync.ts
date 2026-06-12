import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

export interface TextRange {
  from: number;
  to: number;
}

export interface MarkdownMatch {
  start: number;
  end: number;
}

export type FindSearchTarget = "editor" | "raw";

export function findMatchesInDoc(
  editor: Editor,
  query: string,
): TextRange[] {
  const results: TextRange[] = [];
  if (!query || editor.isDestroyed) {
    return results;
  }

  const needle = query.toLowerCase();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const haystack = node.text.toLowerCase();
    let index = 0;
    while (index < haystack.length) {
      const found = haystack.indexOf(needle, index);
      if (found === -1) {
        break;
      }

      results.push({
        from: pos + found,
        to: pos + found + query.length,
      });
      index = found + needle.length;
    }
  });

  return results;
}

export function findMatchesInMarkdown(
  markdown: string,
  query: string,
): MarkdownMatch[] {
  const results: MarkdownMatch[] = [];
  if (!query) {
    return results;
  }

  const needle = query.toLowerCase();
  const haystack = markdown.toLowerCase();
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    results.push({ start: index, end: index + query.length });
    index = haystack.indexOf(needle, index + needle.length);
  }

  return results;
}

export function detectFindSearchTarget(
  editor: Editor,
  textarea: HTMLTextAreaElement | null,
  showRawPane: boolean,
): FindSearchTarget {
  if (!showRawPane || !textarea) {
    return "editor";
  }

  const active = document.activeElement;
  if (active === textarea) {
    return "raw";
  }

  if (active instanceof Node && editor.view.dom.contains(active)) {
    return "editor";
  }

  return "editor";
}

export function setEditorSelectionWithoutFocus(
  editor: Editor,
  from: number,
  to: number,
) {
  if (editor.isDestroyed) {
    return;
  }

  const doc = editor.state.doc;
  const maxPos = doc.content.size;
  const safeFrom = Math.max(1, Math.min(maxPos, from));
  const safeTo = Math.max(safeFrom, Math.min(maxPos, to));
  const selection = TextSelection.create(doc, safeFrom, safeTo);
  editor.view.dispatch(editor.state.tr.setSelection(selection));
}

const FIND_BAR_TOP_CLEARANCE_PX = 112;

function scrollRangeToCenter(
  container: HTMLElement,
  viewportTop: number,
  viewportBottom: number,
  topPadding = FIND_BAR_TOP_CLEARANCE_PX,
) {
  const rect = container.getBoundingClientRect();
  const matchTopInContent = viewportTop - rect.top + container.scrollTop;
  const matchBottomInContent = viewportBottom - rect.top + container.scrollTop;
  const matchCenter = (matchTopInContent + matchBottomInContent) / 2;
  const visibleHeight = container.clientHeight;
  const scrollBefore = container.scrollTop;
  const desiredScrollTop =
    matchCenter - topPadding - (visibleHeight - topPadding) / 2;

  container.scrollTop = Math.max(
    0,
    Math.min(container.scrollHeight - visibleHeight, desiredScrollTop),
  );

  return {
    scrollBefore,
    scrollAfter: container.scrollTop,
    matchTopInContent,
    visibleHeight,
  };
}

function measureTextareaOffsetTop(
  textarea: HTMLTextAreaElement,
  caretIndex: number,
): number {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.whiteSpace = style.whiteSpace;
  mirror.style.wordWrap = style.wordWrap;
  mirror.style.overflowWrap = style.overflowWrap;

  mirror.textContent = textarea.value.slice(0, caretIndex);
  document.body.appendChild(mirror);
  const offsetTop = mirror.scrollHeight;
  document.body.removeChild(mirror);

  return offsetTop;
}

export function scrollTextareaToRange(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  options?: { focus?: boolean },
) {
  if (options?.focus !== false) {
    textarea.focus({ preventScroll: true });
  }
  textarea.setSelectionRange(start, end);

  const style = window.getComputedStyle(textarea);
  const lineHeight =
    Number.parseFloat(style.lineHeight) ||
    Number.parseFloat(style.fontSize) * 1.6 ||
    20;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const matchTop = measureTextareaOffsetTop(textarea, start) + paddingTop;
  const matchBottom =
    measureTextareaOffsetTop(textarea, end) + paddingTop + lineHeight * 0.5;
  const matchCenter = (matchTop + matchBottom) / 2;
  const desiredScrollTop = matchCenter - textarea.clientHeight / 2;

  textarea.scrollTop = Math.max(
    0,
    Math.min(textarea.scrollHeight - textarea.clientHeight, desiredScrollTop),
  );
}

export function scrollEditorRangeIntoView(
  editor: Editor,
  range: TextRange,
  options?: { focus?: boolean },
) {
  if (editor.isDestroyed) {
    return;
  }

  if (options?.focus === false) {
    setEditorSelectionWithoutFocus(editor, range.from, range.to);
  } else {
    editor
      .chain()
      .focus()
      .setTextSelection({ from: range.from, to: range.to })
      .scrollIntoView()
      .run();
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (editor.isDestroyed) {
        return;
      }

      const view = editor.view;
      const start = view.coordsAtPos(range.from);
      const end = view.coordsAtPos(Math.max(range.from, range.to - 1));
      const shell = view.dom.closest<HTMLElement>(".md-editor-shell");
      if (!shell) {
        return;
      }

      scrollRangeToCenter(
        shell,
        Math.min(start.top, end.top),
        Math.max(start.bottom, end.bottom),
      );
    });
  });
}
