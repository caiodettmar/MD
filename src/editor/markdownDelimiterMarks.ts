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
      toggleStoredMarkRule("strike", "~~"),
      toggleStoredMarkRule("highlight", "=="),
      toggleStoredMarkRule("code", "`"),
      // Superscript via ^ delimiter. Guarded so typing footnote syntax [^id]
      // does not toggle superscript. Subscript has no input rule: a single ~
      // cannot be disambiguated from the ~~ strikethrough delimiter, so it is
      // exposed through the slash menu and selection toolbar instead.
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
