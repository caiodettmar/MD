import { Extension, InputRule, markInputRule } from "@tiptap/core";
import { nameToEmoji } from "gemoji";

export const MarkdownDelimiterMarks = Extension.create({
  name: "markdownDelimiterMarks",

  addInputRules() {
    const { schema } = this.editor;
    return [
      // Bold (using ** or __)
      markInputRule({
        find: /(?:^|\s)(\*\*(?!\s)((?:[^*]+))\*\*(?!\s))$/,
        type: schema.marks.bold,
      }),
      markInputRule({
        find: /(?:^|\s)(__(?!\s)((?:[^_]+))__(?!\s))$/,
        type: schema.marks.bold,
      }),
      // Underline (using ___). Must be defined before Italic (_) to match first.
      markInputRule({
        find: /(?:^|\s)(___(?!\s)((?:(?!___)[^_])+)(?<!\s)___)$/,
        type: schema.marks.underline,
      }),
      // Italic (using _ only, removing * to prevent list conflicts)
      markInputRule({
        find: /(?:^|\s)(_(?!\s)((?:[^_]+))_(?!\s))$/,
        type: schema.marks.italic,
      }),
      // Strikethrough (using ~~)
      markInputRule({
        find: /(?:^|\s)(~~(?!\s)((?:[^~]+))~~(?!\s))$/,
        type: schema.marks.strike,
      }),
      // Highlight (using ==)
      markInputRule({
        find: /(?:^|\s)(==(?!\s)((?:[^=]+))==(?!\s))$/,
        type: schema.marks.highlight,
      }),
      // Inline code (using `)
      markInputRule({
        find: /(?:^|\s)(`(?!\s)((?:[^`]+))`(?!\s))$/,
        type: schema.marks.code,
      }),
      // Subscript (using ~)
      markInputRule({
        find: /(?:^|\s)(~(?!\s)((?:[^~]+))~(?!\s))$/,
        type: schema.marks.subscript,
      }),
      // Superscript (using ^)
      markInputRule({
        find: /(?:^|\s)(\^(?!\s)((?:[^^]+))\^(?!\s))$/,
        type: schema.marks.superscript,
      }),
      // Italic shortcut toggle via _ + space
      new InputRule({
        find: /_ $/,
        handler: ({ state, range }) => {
          const markType = schema.marks.italic;
          if (!markType) {
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

      // Table spawning input rule (e.g. |*3 )
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

      // Emoji shortcode input rule (e.g. :smile:)
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

