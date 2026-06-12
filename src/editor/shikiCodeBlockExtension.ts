import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ShikiCodeBlockView } from "./ShikiCodeBlock";
import { mergeAttributes } from "@tiptap/core";

export const ShikiCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mermaidSvg: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mermaid-svg") || "",
        renderHTML: (attributes) => {
          if (!attributes.mermaidSvg) {
            return {};
          }
          return { "data-mermaid-svg": attributes.mermaidSvg };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    if (node.attrs.language === "mermaid" && node.attrs.mermaidSvg) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          class: "md-code-block md-code-block--mermaid-render",
          "data-mermaid-svg": node.attrs.mermaidSvg,
        }),
      ];
    }
    return (
      this.parent?.({ node, HTMLAttributes }) ?? [
        "pre",
        HTMLAttributes,
        ["code", {}, 0],
      ]
    );
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShikiCodeBlockView);
  },
});
