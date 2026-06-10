import Image from "@tiptap/extension-image";
import {
  toDisplayImageSrc,
  toMarkdownImageSrc,
} from "../lib/imageSrc";

export function createMarkdownImage(getDocumentPath: () => string | null) {
  return Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        markdownSrc: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-md-src"),
          renderHTML: (attributes) => {
            if (!attributes.markdownSrc) {
              return {};
            }

            return {
              "data-md-src": attributes.markdownSrc,
            };
          },
        },
      };
    },

    parseMarkdown(token, helpers) {
      const markdownSrc = token.href ?? "";
      return helpers.createNode("image", {
        src: toDisplayImageSrc(markdownSrc, getDocumentPath()),
        alt: token.text,
        title: token.title,
        markdownSrc,
      });
    },

    renderMarkdown(node) {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "");
      const title = String(node.attrs?.title ?? "");
      const markdownSrc = toMarkdownImageSrc(
        src,
        node.attrs?.markdownSrc as string | null | undefined,
      );

      return title
        ? `![${alt}](${markdownSrc} "${title}")`
        : `![${alt}](${markdownSrc})`;
    },
  });
}
