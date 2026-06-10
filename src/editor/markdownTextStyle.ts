import { TextStyle } from "@tiptap/extension-text-style";

/**
 * Serializes text color to inline HTML in markdown output, e.g.
 * <span style="color: #2563eb">text</span>
 */
export const MarkdownTextStyle = TextStyle.extend({
  renderMarkdown(node, helpers) {
    const color = node.attrs?.color as string | undefined;
    if (!color) {
      return helpers.renderChildren(node);
    }

    return `<span style="color: ${color}">${helpers.renderChildren(node)}</span>`;
  },
});
