import { Extension } from "@tiptap/core";

/**
 * Parse custom `linkReference` tokens produced by MarkdownLink's inline tokenizer.
 * The Link mark only registers a handler for marked's native `link` token type.
 */
export const LinkReferenceMarkdownParser = Extension.create({
  name: "linkReferenceMarkdownParser",

  priority: 110,

  markdownTokenName: "linkReference",

  parseMarkdown(token, helpers) {
    const reference = String(token.meta?.reference ?? "").trim();
    if (!reference) {
      return [];
    }

    const href = token.meta?.href ? String(token.meta.href) : "";
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
  },
});
