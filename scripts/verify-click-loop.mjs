import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { createEditorExtensions } from "../src/editor/extensions.ts";

const markdown = `Hello [link][mdg] world.

[mdg]: https://example.com "Example"`;

let appendPasses = 0;
let updates = 0;

const editor = new Editor({
  extensions: createEditorExtensions(),
  content: markdown,
  contentType: "markdown",
  onUpdate: () => {
    updates += 1;
    if (updates > 500) {
      throw new Error(`Too many updates (${updates})`);
    }
  },
});

const maintainKey = editor.state.plugins.find(
  (plugin) => plugin.spec.key?.key === "linkReferenceDefinitionMaintain",
);

if (maintainKey?.spec.appendTransaction) {
  const original = maintainKey.spec.appendTransaction.bind(maintainKey.spec);
  maintainKey.spec.appendTransaction = (...args) => {
    appendPasses += 1;
    if (appendPasses > 500) {
      throw new Error(`Too many append passes (${appendPasses})`);
    }
    return original(...args);
  };
}

for (let index = 0; index < 50; index += 1) {
  const pos = Math.min(1 + index, editor.state.doc.content.size);
  editor.view.dispatch(
    editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, pos),
    ),
  );
}

console.log("selection clicks", 50);
console.log("appendPasses", appendPasses);
console.log("updates", updates);
editor.destroy();
