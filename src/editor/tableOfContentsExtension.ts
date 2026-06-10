import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { TableOfContentsView } from "./TableOfContentsView";

/** Markdown convention: a single `[TOC]` line still round-trips this block. */
export const TOC_MARKDOWN_MARKER = "[TOC]";

const TOC_LIST_LINE_RE = /^(\s*)-\s+\[([^\]]+)\]\(#([^)]+)\)\s*$/;

function tocIndentLevel(indent: string): number {
  return Math.min(3, Math.floor(indent.length / 2) + 1);
}

function parseTocMarkdownBlock(src: string): { raw: string; entries: TocEntry[] } | null {
  const lines = src.split("\n");
  const entries: TocEntry[] = [];
  const rawLines: string[] = [];

  for (const line of lines) {
    const match = TOC_LIST_LINE_RE.exec(line);
    if (!match) {
      break;
    }

    entries.push({
      level: tocIndentLevel(match[1]),
      text: match[2],
      anchor: match[3],
    });
    rawLines.push(line);
  }

  if (entries.length === 0) {
    return null;
  }

  return { raw: rawLines.join("\n"), entries };
}

export function renderTocMarkdown(entries: TocEntry[]): string {
  if (entries.length === 0) {
    return TOC_MARKDOWN_MARKER;
  }

  return entries
    .map((entry) => {
      const indent = "  ".repeat(Math.max(0, entry.level - 1));
      return `${indent}- [${entry.text}](#${entry.anchor})`;
    })
    .join("\n");
}

export interface TocEntry {
  level: number;
  text: string;
  anchor: string;
}

export function scanDocumentHeadings(doc: ProseMirrorNode): TocEntry[] {
  const entries: TocEntry[] = [];

  doc.descendants((node) => {
    if (node.type.name !== "heading") {
      return;
    }

    const level = Number(node.attrs.level ?? 1);
    if (level > 3) {
      return;
    }

    const text = node.textContent.trim();
    if (!text) {
      return;
    }

    const anchor =
      typeof node.attrs.id === "string" && node.attrs.id.trim()
        ? node.attrs.id.trim()
        : text.toLowerCase().replace(/\s+/g, "-");

    entries.push({ level, text, anchor });
  });

  return entries;
}

export const TableOfContents = Node.create({
  name: "tableOfContents",

  group: "block",

  atom: true,

  selectable: true,

  draggable: false,

  addAttributes() {
    return {
      entries: {
        default: [] as TocEntry[],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-toc-entries");
          if (!raw) {
            return [];
          }

          try {
            return JSON.parse(raw) as TocEntry[];
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => {
          const entries = attributes.entries as TocEntry[] | undefined;
          if (!entries?.length) {
            return {};
          }

          return {
            "data-toc-entries": JSON.stringify(entries),
          };
        },
      },
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-toc-collapsed") === "true",
        renderHTML: (attributes) => {
          if (!attributes.collapsed) {
            return {};
          }

          return { "data-toc-collapsed": "true" };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-table-of-contents="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-table-of-contents": "true",
        class: "md-toc",
      }),
    ];
  },

  renderMarkdown(node) {
    const entries = (node.attrs?.entries as TocEntry[] | undefined) ?? [];
    return renderTocMarkdown(entries);
  },

  parseMarkdown(token, helpers) {
    const entries = (token.meta?.entries as TocEntry[] | undefined) ?? [];
    return helpers.createNode("tableOfContents", { entries, collapsed: false });
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableOfContentsHydrate"),
        appendTransaction: (_transactions, _oldState, newState) => {
          let tr: Transaction | null = null;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "tableOfContents") {
              return;
            }

            const entries = (node.attrs.entries as TocEntry[] | undefined) ?? [];
            if (entries.length > 0) {
              return;
            }

            const scanned = scanDocumentHeadings(newState.doc);
            if (scanned.length === 0) {
              return;
            }

            if (!tr) {
              tr = newState.tr;
            }

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              entries: scanned,
            });
            changed = true;
          });

          return changed ? tr : null;
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "tableOfContents",
    level: "block",
    start(src) {
      const markerMatch = /^\[TOC\]\s*(?:\n|$)/im.exec(src);
      if (markerMatch) {
        return markerMatch.index ?? -1;
      }

      const listMatch = /^\s*-\s+\[[^\]]+\]\(#[^)]+\)/m.exec(src);
      return listMatch?.index ?? -1;
    },
    tokenize(src) {
      const markerMatch = /^\[TOC\]\s*(?:\n|$)/i.exec(src);
      if (markerMatch) {
        return {
          type: "tableOfContents",
          raw: markerMatch[0],
          meta: { entries: [] as TocEntry[] },
        };
      }

      const parsed = parseTocMarkdownBlock(src);
      if (!parsed) {
        return undefined;
      }

      return {
        type: "tableOfContents",
        raw: parsed.raw,
        meta: { entries: parsed.entries },
      };
    },
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView);
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ chain, state }) => {
          const entries = scanDocumentHeadings(state.doc);
          return chain()
            .insertContent({
              type: this.name,
              attrs: { entries, collapsed: false },
            })
            .run();
        },
      updateTableOfContents:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let tocPos: number | null = null;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === this.name) {
              tocPos = pos;
              return false;
            }

            return undefined;
          });

          if (tocPos === null) {
            return false;
          }

          const entries = scanDocumentHeadings(state.doc);
          if (dispatch) {
            const node = state.doc.nodeAt(tocPos);
            if (!node) {
              return false;
            }

            dispatch(
              tr.setNodeMarkup(tocPos, undefined, {
                ...node.attrs,
                entries,
              }),
            );
          }

          return true;
        },
    };
  },
});

export function insertTableOfContents(editor: Editor) {
  return editor.chain().focus().insertTableOfContents().run();
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
      updateTableOfContents: () => ReturnType;
    };
  }
}
