import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Parse plain-text clipboard content as markdown so pasted syntax becomes
 * structured nodes/marks instead of escaped literal brackets.
 */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste(_view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard || !editor.markdown) {
              return false;
            }

            const plain = clipboard.getData("text/plain");
            if (!plain) {
              return false;
            }

            const html = clipboard.getData("text/html");
            if (html.trim()) {
              return false;
            }

            event.preventDefault();
            return editor.commands.insertContent(plain, {
              contentType: "markdown",
            });
          },
        },
      }),
    ];
  },
});
