import { Extension, InputRule } from "@tiptap/core";
import { nameToEmoji } from "gemoji";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toggleStoredMarkRule(markName: string, delimiter: string) {
  return new InputRule({
    find: new RegExp(`${escapeRegex(delimiter)}$`),
    handler: ({ state, range }) => {
      const markType = state.schema.marks[markName];
      if (!markType) {
        return null;
      }

      const { tr } = state;
      tr.delete(range.from, range.to);

      const activeMarks =
        state.storedMarks ?? state.selection.$from.marks();
      const isActive = markType.isInSet(activeMarks);

      if (isActive) {
        tr.removeStoredMark(markType);
      } else {
        tr.addStoredMark(markType.create());
      }
    },
  });
}

export const MarkdownDelimiterMarks = Extension.create({
  name: "markdownDelimiterMarks",

  addInputRules() {
    return [
      toggleStoredMarkRule("bold", "**"),
      toggleStoredMarkRule("italic", "*"),
      toggleStoredMarkRule("underline", "___"),
      toggleStoredMarkRule("strike", "~~"),
      toggleStoredMarkRule("highlight", "=="),
      toggleStoredMarkRule("code", "`"),
      new InputRule({
        find: /^\|\*(\d+)\s$/,
        handler: ({ state, range, match }) => {
          const size = parseInt(match[1], 10);
          if (isNaN(size) || size < 1) {
            return null;
          }

          const { tr } = state;
          tr.delete(range.from, range.to);

          const editor = this.editor;
          setTimeout(() => {
            editor.chain().focus().insertTable({ rows: size, cols: size, withHeaderRow: true }).run();
          }, 0);
        },
      }),
      // Subscript via `~ ` (tilde + space). Space avoids bare `~` in words;
      // guard skips `~~` strikethrough. Same trigger toggles stored mark off.
      new InputRule({
        find: /~ $/,
        handler: ({ state, range }) => {
          const markType = state.schema.marks.subscript;
          if (!markType) {
            return null;
          }

          const tildeFrom = range.from;
          const before = state.doc.textBetween(
            Math.max(0, tildeFrom - 1),
            tildeFrom,
          );
          if (before === "~") {
            return null;
          }

          const { tr } = state;
          tr.delete(range.from, range.to);

          const activeMarks =
            state.storedMarks ?? state.selection.$from.marks();
          if (markType.isInSet(activeMarks)) {
            tr.removeStoredMark(markType);
          } else {
            tr.addStoredMark(markType.create());
          }
        },
      }),
      // Superscript via ^ delimiter. Guarded so typing footnote syntax [^id]
      // does not toggle superscript.
      new InputRule({
        find: /\^$/,
        handler: ({ state, range }) => {
          const markType = state.schema.marks.superscript;
          if (!markType) {
            return null;
          }

          const before = state.doc.textBetween(
            Math.max(0, range.from - 1),
            range.from,
          );
          if (before === "[") {
            return null;
          }

          const { tr } = state;
          tr.delete(range.from, range.to);

          const activeMarks = state.storedMarks ?? state.selection.$from.marks();
          if (markType.isInSet(activeMarks)) {
            tr.removeStoredMark(markType);
          } else {
            tr.addStoredMark(markType.create());
          }
        },
      }),
      new InputRule({
        find: /:([a-z0-9_+-]+):$/,
        handler: ({ state, range, match }) => {
          const shortcode = match[1]?.toLowerCase();
          if (!shortcode) {
            return null;
          }

          const emoji = nameToEmoji[shortcode];
          if (!emoji) {
            return null;
          }

          const { tr } = state;
          tr.replaceWith(range.from, range.to, state.schema.text(emoji));
        },
      }),
    ];
  },
});

export function resolveEmojiShortcode(name: string): string | null {
  return nameToEmoji[name.toLowerCase()] ?? null;
}
