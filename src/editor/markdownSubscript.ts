import Subscript from "@tiptap/extension-subscript";

/**
 * Serializes subscript to inline HTML in markdown output, e.g. <sub>text</sub>
 */
export const MarkdownSubscript = Subscript.extend({
  renderMarkdown(node, helpers) {
    return `<sub>${helpers.renderChildren(node)}</sub>`;
  },
});
