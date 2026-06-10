import type { Editor } from "@tiptap/react";

export function insertDefaultTable(editor: Editor) {
  return editor
    .chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
}
