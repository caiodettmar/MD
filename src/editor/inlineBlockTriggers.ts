import { Extension, InputRule } from "@tiptap/core";

/**
 * Typora-like block triggers: markdown markers disappear after typing the
 * trailing space at the start of a line.
 */
export const InlineBlockTriggers = Extension.create({
  name: "inlineBlockTriggers",

  addInputRules() {
    return [
      new InputRule({
        find: /^#{6}\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 6 })
            .run();
        },
      }),
      new InputRule({
        find: /^#{5}\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 5 })
            .run();
        },
      }),
      new InputRule({
        find: /^#{4}\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 4 })
            .run();
        },
      }),
      new InputRule({
        find: /^#{3}\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 3 })
            .run();
        },
      }),
      new InputRule({
        find: /^#{2}\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 2 })
            .run();
        },
      }),
      new InputRule({
        find: /^#\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHeading({ level: 1 })
            .run();
        },
      }),
      new InputRule({
        find: /^[-*]\s(\S)$/,
        handler: ({ chain, range, match }) => {
          const nextChar = match[1];
          if (nextChar === "[") {
            return;
          }

          chain()
            .deleteRange({ from: range.from, to: range.to })
            .toggleBulletList()
            .insertContent(nextChar)
            .run();
        },
      }),
      new InputRule({
        find: /^(\d+)\.\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .toggleOrderedList()
            .run();
        },
      }),
      new InputRule({
        find: /^>\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .toggleBlockquote()
            .run();
        },
      }),
      new InputRule({
        find: /^[-*]\s\[\s\]\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .toggleTaskList()
            .run();
        },
      }),
      new InputRule({
        find: /^[-*]\s\[[xX]\]\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .toggleTaskList()
            .run();
        },
      }),
      new InputRule({
        find: /^---$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .setHorizontalRule()
            .run();
        },
      }),
      new InputRule({
        find: /^```([a-zA-Z0-9+#.-]*)$/,
        handler: ({ chain, range, match }) => {
          const language = match[1]?.trim();
          const command = chain().deleteRange({ from: range.from, to: range.to });
          if (language) {
            command.setCodeBlock({ language }).run();
          } else {
            command.toggleCodeBlock().run();
          }
        },
      }),
    ];
  },
});
