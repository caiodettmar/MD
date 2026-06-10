import { InputRule, Mark, mergeAttributes, type InputRuleMatch } from "@tiptap/core";

function findFootnoteReferenceInput(text: string): InputRuleMatch | null {
  // Line-start definition prefix — wait for `[^id]:` input rules.
  if (/^\[\^([a-zA-Z0-9_-]+)\]:/.test(text)) {
    return null;
  }

  // Link reference definition prefix — wait for `[id]:` input rules.
  if (/^\[(?!\^)([^\]\n]+)\]:/.test(text)) {
    return null;
  }

  const lineStartRef = /^\[\^([a-zA-Z0-9_-]+)\]\s$/.exec(text);
  if (lineStartRef && lineStartRef.index !== undefined) {
    return { text: lineStartRef[0], index: lineStartRef.index, match: lineStartRef };
  }

  const inlineRef = /\[\^([a-zA-Z0-9_-]+)\]$/.exec(text);
  if (inlineRef && inlineRef.index > 0 && inlineRef.index !== undefined) {
    return { text: inlineRef[0], index: inlineRef.index, match: inlineRef };
  }

  return null;
}

/**
 * GFM-style footnote references: [^label]
 */
export const FootnoteExtension = Mark.create({
  name: "footnote",

  priority: 50,

  markdownTokenName: "footnoteReference",

  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-footnote-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-footnote-id": attributes.id,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sup[data-footnote-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, { class: "md-footnote-ref" }),
      0,
    ];
  },

  renderMarkdown(node, helpers) {
    return `[^${helpers.renderChildren(node)}]`;
  },

  parseMarkdown(token, helpers) {
    const id = String(token.meta?.id ?? token.text ?? "");
    return helpers.applyMark("footnote", [{ type: "text", text: id }], { id });
  },

  addInputRules() {
    return [
      new InputRule({
        find: findFootnoteReferenceInput,
        handler: ({ state, range, match }) => {
          const id = /\[\^([a-zA-Z0-9_-]+)\]/.exec(match[0])?.[1];
          const markType = state.schema.marks.footnote;
          if (!id || !markType) {
            return null;
          }

          state.tr.replaceWith(
            range.from,
            range.to,
            state.schema.text(id, [markType.create({ id })]),
          );
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "footnoteReference",
    level: "inline",
    start: (src: string) => src.indexOf("[^"),
    tokenize(src, _tokens, lexer) {
      const rule = /^\[\^([a-zA-Z0-9_-]+)\](?!:)/;
      const match = rule.exec(src);
      if (!match) {
        return undefined;
      }

      const id = match[1] ?? "";
      return {
        type: "footnoteReference",
        raw: match[0],
        text: id,
        meta: { id },
        tokens: lexer.inlineTokens(id),
      };
    },
  },
});
