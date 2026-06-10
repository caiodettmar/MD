import Highlight from "@tiptap/extension-highlight";

/**
 * Serializes highlight to markdown: default highlights round-trip as
 * ==text==, colored highlights fall back to inline HTML, e.g.
 * <mark style="background-color: #fde68a">text</mark>
 */
export const MarkdownHighlight = Highlight.extend({
  renderMarkdown(node, helpers) {
    const color = node.attrs?.color as string | undefined;
    const content = helpers.renderChildren(node);
    if (!color) {
      return `==${content}==`;
    }

    return `<mark style="background-color: ${color}">${content}</mark>`;
  },
});
