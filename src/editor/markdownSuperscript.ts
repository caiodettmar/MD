import Superscript from "@tiptap/extension-superscript";

/**
 * Serializes superscript to inline HTML in markdown output, e.g. <sup>text</sup>
 */
export const MarkdownSuperscript = Superscript.extend({
  renderMarkdown(node, helpers) {
    return `<sup>${helpers.renderChildren(node)}</sup>`;
  },
});
