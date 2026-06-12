import Heading from "@tiptap/extension-heading";
import { mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";

const headingAnchorKey = new PluginKey("headingAnchor");

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "section";
}

function assignHeadingIds(state: EditorState): Transaction | null {
  const used = new Map<string, number>();
  let tr: Transaction | null = null;

  state.doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name !== "heading") {
      return;
    }

    const text = node.textContent;
    const base = slugifyHeading(text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const nextId = count === 0 ? base : `${base}-${count + 1}`;

    if (node.attrs.id === nextId) {
      return;
    }

    if (!tr) {
      tr = state.tr;
    }

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      id: nextId,
    });
  });

  return tr;
}

export const HeadingWithAnchor = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return { id: attributes.id };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level;
    if (level <= 3) {
      return [
        `h${level}`,
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: "md-heading-with-toc",
        }),
        [
          "span",
          { class: "md-heading-text" },
          0,
        ],
        [
          "a",
          {
            href: "#",
            class: "md-back-to-toc",
            "data-toc-back": "true",
            title: "Go to Table of Contents",
            contenteditable: "false",
          },
          "↑",
        ],
      ];
    }

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingAnchorKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          return assignHeadingIds(newState);
        },
      }),
    ];
  },
});
