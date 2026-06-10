import Link from "@tiptap/extension-link";
import { InputRule, type InputRuleMatch } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import {
  collectLinkReferenceDefinitions,
  isInsideLinkReferenceDefinition,
} from "./linkReferenceDefinitionUtils";

function findReferenceLinkInput(text: string): InputRuleMatch | null {
  if (/^\[\^/.test(text)) {
    return null;
  }

  // Line-start reference definition prefix — wait for `[id]:` input rules.
  if (/^\[(?!\^)([^\]\n]+)\]:/.test(text)) {
    return null;
  }

  const match = /\[([^\]\n]+)\]\[([^\]\n]+)\]$/.exec(text);
  if (!match || match.index === undefined) {
    return null;
  }

  return { text: match[0], index: match.index, match };
}

export const MarkdownLink = Link.extend({
  name: "link",

  priority: 100,

  addAttributes() {
    return {
      ...this.parent?.(),
      reference: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-reference"),
        renderHTML: (attributes) => {
          if (!attributes.reference) {
            return {};
          }

          return {
            "data-link-reference": attributes.reference,
          };
        },
      },
    };
  },

  inclusive() {
    return false;
  },

  renderMarkdown(node, helpers) {
    const text = helpers.renderChildren(node);
    const reference = node.attrs?.reference as string | null | undefined;

    if (reference) {
      return `[${text}][${reference}]`;
    }

    const href = String(node.attrs?.href ?? "");
    const title = node.attrs?.title ? String(node.attrs.title) : "";

    return title ? `[${text}](${href} "${title}")` : `[${text}](${href})`;
  },

  parseMarkdown(token, helpers) {
    if (token.type === "linkReference") {
      const reference = String(token.meta?.reference ?? "");
      const href = String(token.meta?.href ?? "");
      const title = token.meta?.title ? String(token.meta.title) : null;

      return helpers.applyMark(
        "link",
        helpers.parseInline(token.tokens || []),
        {
          href,
          title,
          reference,
        },
      );
    }

    return helpers.applyMark("link", helpers.parseInline(token.tokens || []), {
      href: token.href,
      title: token.title || null,
      reference: null,
    });
  },

  markdownTokenizer: {
    name: "linkReference",
    level: "inline",
    start(src) {
      const index = src.indexOf("[");
      if (index === -1) {
        return index;
      }

      if (src[index + 1] === "^") {
        return -1;
      }

      return index;
    },
    tokenize(src, _tokens, lexer) {
      if (/^\[\^/.test(src)) {
        return undefined;
      }

      const rule = /^\[([^\]\n]+)\]\[([^\]\n]+)\]/;
      const match = rule.exec(src);
      if (!match) {
        return undefined;
      }

      const text = match[1] ?? "";
      const reference = match[2]?.trim() ?? "";
      if (!reference) {
        return undefined;
      }

      return {
        type: "linkReference",
        raw: match[0],
        text,
        meta: { reference },
        tokens: lexer.inlineTokens(text),
      };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: findReferenceLinkInput,
        handler: ({ state, range, match }) => {
          const parsed = /\[([^\]\n]+)\]\[([^\]\n]+)\]/.exec(match[0]);
          const text = parsed?.[1]?.trim();
          const reference = parsed?.[2]?.trim();
          const markType = state.schema.marks.link;

          if (!text || !reference || !markType) {
            return null;
          }

          const insertFrom = range.from;
          state.tr.replaceWith(
            range.from,
            range.to,
            state.schema.text(text, [
              markType.create({
                href: "",
                title: null,
                reference,
              }),
            ]),
          );

          const cursorPos = insertFrom + text.length;
          state.tr.setSelection(TextSelection.create(state.tr.doc, cursorPos));
          state.tr.removeStoredMark(markType);
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const parent = this.parent?.() ?? [];

    return [
      ...parent.map((plugin) => {
        if (plugin.spec.key?.key !== "autolink" || !plugin.spec.appendTransaction) {
          return plugin;
        }

        const originalAppend = plugin.spec.appendTransaction.bind(plugin.spec);

        return new Plugin({
          ...plugin.spec,
          appendTransaction: (transactions, oldState, newState) => {
            const tr = originalAppend(transactions, oldState, newState);
            if (!tr || !tr.steps.length) {
              return tr ?? null;
            }

            const defType = newState.schema.nodes.linkReferenceDefinition;
            const linkMark = newState.schema.marks.link;
            if (!defType || !linkMark) {
              return tr;
            }

            let changed = false;
            tr.doc.descendants((node, pos) => {
              if (!node.isText || !node.marks.some((mark) => mark.type === linkMark)) {
                return true;
              }

              if (!isInsideLinkReferenceDefinition(tr.doc, pos)) {
                return true;
              }

              tr.removeMark(pos, pos + node.nodeSize, linkMark);
              changed = true;
              return true;
            });

            if (!changed) {
              return tr;
            }

            tr.setMeta("preventAutolink", true);
            return tr;
          },
        });
      }),
      new Plugin({
        key: new PluginKey("linkReferenceSync"),
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some((transaction) => transaction.docChanged);
          if (!docChanged) {
            return null;
          }

          if (
            transactions.some((transaction) =>
              transaction.getMeta("linkReferenceDefinitionMaintain"),
            )
          ) {
            return null;
          }

          const markType = newState.schema.marks.link;
          if (!markType) {
            return null;
          }

          const definitions = collectLinkReferenceDefinitions(newState.doc);
          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (!node.isText) {
              return true;
            }

            for (const mark of node.marks) {
              if (mark.type !== markType) {
                continue;
              }

              const reference = mark.attrs.reference as string | null | undefined;
              if (!reference) {
                continue;
              }

              const definition = definitions.get(reference.toLowerCase());
              const nextHref = definition?.href ?? mark.attrs.href ?? "";
              const referenceAttr = mark.attrs.reference;
              const currentHref = String(mark.attrs.href ?? "");

              if (currentHref === nextHref) {
                continue;
              }

              const from = pos;
              const to = pos + node.nodeSize;
              tr.removeMark(from, to, markType);
              tr.addMark(
                from,
                to,
                markType.create({
                  href: nextHref,
                  title: mark.attrs.title ?? null,
                  reference: referenceAttr,
                }),
              );
              changed = true;
            }

            return true;
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});
