import Image from "@tiptap/extension-image";
import { InputRule, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import {
  buildImageNodeAttrs,
  normalizeMarkdownImageSrc,
  toDisplayImageSrc,
  toMarkdownImageSrc,
} from "../lib/imageSrc";

const imageRefreshKey = new PluginKey("markdownImageRefresh");

function readImageElementAttrs(
  element: HTMLElement,
  getDocumentPath: () => string | null,
) {
  const rawSrc = element.getAttribute("src") ?? "";
  if (!rawSrc.trim()) {
    return false;
  }

  const dataMarkdownSrc = element.getAttribute("data-md-src");
  const markdownSrc = dataMarkdownSrc?.trim() || rawSrc.trim();

  return buildImageNodeAttrs(markdownSrc, getDocumentPath(), {
    alt: element.getAttribute("alt"),
    title: element.getAttribute("title"),
  });
}

function createImageRefreshPlugin(getDocumentPath: () => string | null) {
  return new Plugin({
    key: imageRefreshKey,
    appendTransaction: (transactions, _oldState, newState) => {
      const shouldRefresh = transactions.some(
        (transaction) =>
          transaction.docChanged || transaction.getMeta("refreshImageSrc"),
      );
      if (!shouldRefresh) {
        return null;
      }

      const documentPath = getDocumentPath();
      let transaction = newState.tr;
      let changed = false;

      newState.doc.descendants((node, pos) => {
        if (node.type.name !== "image") {
          return;
        }

        const displaySrc = String(node.attrs.src ?? "");
        const markdownSrc = normalizeMarkdownImageSrc(
          displaySrc,
          node.attrs.markdownSrc as string | null | undefined,
          documentPath,
        );
        const nextDisplaySrc = toDisplayImageSrc(markdownSrc, documentPath);
        const nextAlt = node.attrs.alt ?? null;
        const nextTitle = node.attrs.title ?? null;

        if (
          node.attrs.src === nextDisplaySrc &&
          node.attrs.markdownSrc === markdownSrc
        ) {
          return;
        }

        transaction = transaction.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: nextDisplaySrc,
          markdownSrc,
          alt: nextAlt,
          title: nextTitle,
        });
        changed = true;
      });

      return changed ? transaction : null;
    },
  });
}

function createImageDragSelectPlugin() {
  return new Plugin({
    key: new PluginKey("imageDragSelect"),
    view(editorView) {
      const handleMousedown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target) {
          const img = target.nodeName === "IMG" ? target : target.closest("img");
          if (img) {
            try {
              const pos = editorView.posAtDOM(img, 0);
              if (pos >= 0) {
                const node = editorView.state.doc.nodeAt(pos);
                if (node && node.type.name === "image") {
                  // Select the image node
                  const selection = NodeSelection.create(editorView.state.doc, pos);
                  const transaction = editorView.state.tr.setSelection(selection);
                  editorView.dispatch(transaction);
                  
                  // Stop propagation so ProseMirror doesn't handle the mousedown and overwrite selection
                  event.stopPropagation();
                }
              }
            } catch (e) {
              console.error("Error in image mousedown handler:", e);
            }
          }
        }
      };

      editorView.dom.addEventListener("mousedown", handleMousedown, true);

      return {
        destroy() {
          editorView.dom.removeEventListener("mousedown", handleMousedown, true);
        },
      };
    },
  });
}

export function createMarkdownImage(getDocumentPath: () => string | null) {
  return Image.extend({
    draggable: true,
    atom: true,
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

    parseHTML() {
      return [
        {
          tag: "img[src]",
          getAttrs: (element) => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }
            return readImageElementAttrs(element, getDocumentPath);
          },
        },
        {
          tag: "picture",
          getAttrs: (element) => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }

            const img = element.querySelector("img[src]");
            if (!(img instanceof HTMLImageElement)) {
              return false;
            }

            return readImageElementAttrs(img, getDocumentPath);
          },
        },
      ];
    },

    parseMarkdown(token, helpers) {
      const markdownSrc = token.href ?? "";
      const attrs = buildImageNodeAttrs(markdownSrc, getDocumentPath(), {
        alt: token.text,
        title: token.title,
      });

      return helpers.createNode("image", attrs);
    },

    renderMarkdown(node) {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "");
      const title = String(node.attrs?.title ?? "");
      const markdownSrc = toMarkdownImageSrc(
        src,
        node.attrs?.markdownSrc as string | null | undefined,
        getDocumentPath(),
      );

      return title
        ? `![${alt}](${markdownSrc} "${title}")`
        : `![${alt}](${markdownSrc})`;
    },

    addProseMirrorPlugins() {
      return [
        createImageRefreshPlugin(getDocumentPath),
        createImageDragSelectPlugin(),
      ];
    },

    addInputRules() {
      const imageType = this.type;
      const documentPath = getDocumentPath;

      const insertImageFromMatch = (
        state: Parameters<InputRule["handler"]>[0]["state"],
        range: { from: number; to: number },
        alt: string,
        url: string,
      ) => {
        if (!imageType) {
          return null;
        }

        const attrs = buildImageNodeAttrs(url, documentPath(), { alt });
        const imageNode = imageType.create(attrs);
        state.tr.replaceWith(range.from, range.to, imageNode);
      };

      return [
        new InputRule({
          find: /^!\[([^\]]*)\]\(([^)]+)\)$/,
          handler: ({ state, range, match }) => {
            insertImageFromMatch(state, range, match[1] ?? "", match[2] ?? "");
          },
        }),
        new InputRule({
          find: /!\[([^\]]*)\]\(([^)]+)\)$/,
          handler: ({ state, range, match }) => {
            insertImageFromMatch(state, range, match[1] ?? "", match[2] ?? "");
          },
        }),
      ];
    },
  });
}

export function refreshImageDisplaySrc(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setMeta("refreshImageSrc", true));
}
