import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { TableOfContentsView } from "./TableOfContentsView";

/** Markdown convention: a single mixed-case `[ToC]` line represents this block. */
export const TOC_MARKDOWN_MARKER = "[ToC]";

const TOC_LIST_LINE_RE = /^(\s*)(?:-\s+|\d+\.\s+)\[([^\]]+)\]\(#([^)]+)\)\s*$/;

function tocIndentLevel(indent: string): number {
  return Math.min(3, Math.floor(indent.length / 2) + 1);
}

export function computeTocNumbers(entries: TocEntry[]): string[] {
  const counters: number[] = [];
  const numbers: string[] = [];

  for (const entry of entries) {
    const level = entry.level;

    while (counters.length > level) {
      counters.pop();
    }

    while (counters.length < level - 1) {
      counters.push(1);
    }

    if (counters.length === level) {
      counters[level - 1]++;
    } else {
      counters.push(1);
    }

    numbers.push(counters.join("."));
  }

  return numbers;
}
export function renderTocMarkdown(entries: TocEntry[]): string {
  const marker = "[ToC]";
  if (entries.length === 0) {
    return marker;
  }

  const counters: number[] = [];
  const list = entries
    .map((entry) => {
      const level = entry.level;
      while (counters.length > level) {
        counters.pop();
      }
      while (counters.length < level) {
        counters.push(0);
      }
      counters[level - 1]++;

      const num = counters[level - 1];
      const indent = "  ".repeat(Math.max(0, level - 1));
      return `${indent}${num}. [${entry.text}](#${entry.anchor})`;
    })
    .join("\n");
  return `${marker}\n${list}\n[/ToC]`;
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
    if (level > 6) {
      return;
    }

    // Strip trailing colons from the heading text for the Table of Contents
    const text = node.textContent.trim().replace(/:+$/, "").trim();
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

export interface TocTreeNode {
  entry?: TocEntry;
  children: TocTreeNode[];
}

export function buildTocTree(entries: TocEntry[]): TocTreeNode {
  const root: TocTreeNode = { children: [] };
  const stack: { node: TocTreeNode; level: number }[] = [{ node: root, level: 0 }];

  for (const entry of entries) {
    const level = entry.level;

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parentNode = stack[stack.length - 1].node;
    const newNode: TocTreeNode = { entry, children: [] };
    parentNode.children.push(newNode);
    stack.push({ node: newNode, level });
  }

  return root;
}

function renderTocTreeHTML(nodes: TocTreeNode[]): any[] {
  if (nodes.length === 0) {
    return [];
  }

  const listItems = nodes.map((node) => {
    const entry = node.entry!;
    const itemChildren: any[] = [
      ["a", { class: "md-toc__link", href: `#${entry.anchor}` }, entry.text]
    ];
    if (node.children.length > 0) {
      itemChildren.push(renderTocTreeHTML(node.children));
    }
    return ["li", { class: "md-toc__item" }, ...itemChildren];
  });

  return ["ol", { class: "md-toc__list" }, ...listItems];
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

  renderHTML({ node, HTMLAttributes }) {
    const entries = (node.attrs.entries as TocEntry[] | undefined) ?? [];
    const collapsed = !!node.attrs.collapsed;

    const children: any[] = [];

    // Header container
    const headerChildren: any[] = [];
    
    // Toggle button
    const toggleChildren: any[] = [
      ["span", { class: `md-toc__chevron${collapsed ? " is-collapsed" : ""}`, "aria-hidden": "true" }],
      ["span", {}, "Table of contents"]
    ];
    headerChildren.push(["button", { type: "button", class: "md-toc__toggle" }, ...toggleChildren]);
    
    children.push(["div", { class: "md-toc__header" }, ...headerChildren]);

    // List of items
    if (!collapsed && entries.length > 0) {
      const tree = buildTocTree(entries);
      children.push(renderTocTreeHTML(tree.children));
    } else if (entries.length === 0) {
      children.push(["p", { class: "md-toc__empty" }, "No headings yet — add H1–H6, then Update ToC."]);
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-table-of-contents": "true",
        class: `md-toc${collapsed ? " is-collapsed" : ""}`,
      }),
      ...children
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
      const markerMatch = /^\[TOC\]/i.exec(src);
      return markerMatch ? markerMatch.index : -1;
    },
    tokenize(src) {
      const match = /^\[TOC\](?:\r?\n)?/i.exec(src);
      if (!match) {
        return undefined;
      }
      const header = match[0];
      const rest = src.slice(header.length);

      const lines = rest.split(/\r?\n/);
      const entries: TocEntry[] = [];
      const consumedLines: string[] = [header.replace(/\r?\n$/, "")];

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\[\/TOC\]$/i.test(trimmed)) {
          consumedLines.push(line);
          break;
        }

        const itemMatch = TOC_LIST_LINE_RE.exec(line);
        if (!itemMatch) {
          // Stop parsing if we hit a line that is not a list item (fallback for old-style without closing tag)
          break;
        }

        const rawText = itemMatch[2];
        const cleanText = rawText.replace(/^\d+(?:\.\d+)*\s+/, "");
        entries.push({
          level: tocIndentLevel(itemMatch[1]),
          text: cleanText,
          anchor: itemMatch[3],
        });
        consumedLines.push(line);
      }

      return {
        type: "tableOfContents",
        raw: consumedLines.join("\n"),
        meta: { entries },
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
