import { Extension } from "@tiptap/core";

/**
 * Parse marked's native `def` tokens into link reference definition blocks.
 * Skips footnote-style labels (`[^id]`) which use a dedicated tokenizer.
 */
export const LinkReferenceDefMarkdownParser = Extension.create({
  name: "linkReferenceDefMarkdownParser",

  priority: 1001,

  markdownTokenName: "def",

  parseMarkdown(token, helpers) {
    const tag = String(token.tag ?? "").trim();
    const href = String(token.href ?? "").trim();

    if (!tag || tag.startsWith("^") || !href) {
      return [];
    }

    const title = token.title ? String(token.title) : null;

    const body = title ? `${href} "${title}"` : href;

    return helpers.createNode(
      "linkReferenceDefinition",
      { id: tag, href, title, confirmed: true },
      [
        {
          type: "paragraph",
          content: body ? [{ type: "text", text: body }] : [],
        },
      ],
    );
  },
});
