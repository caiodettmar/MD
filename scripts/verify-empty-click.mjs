import { Editor } from "@tiptap/core";
import { createEditorExtensions } from "../src/editor/extensions.ts";

let updates = 0;

const editor = new Editor({
  extensions: createEditorExtensions(),
  content: "",
  contentType: "markdown",
  onUpdate: () => {
    updates += 1;
    if (updates > 500) {
      throw new Error(`Too many updates (${updates})`);
    }
  },
});

for (let index = 0; index < 50; index += 1) {
  editor.view.dispatch(editor.state.tr.scrollIntoView());
  editor.commands.focus();
}

console.log("empty doc clicks", 50);
console.log("updates", updates);
editor.destroy();
