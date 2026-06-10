import { InputRule, Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export const DefinitionTerm = Node.create({
  name: "definitionTerm",

  content: "inline*",

  defining: true,

  parseHTML() {
    return [{ tag: "dt" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "dt",
      mergeAttributes(HTMLAttributes, { class: "md-dt" }),
      0,
    ];
  },

  renderMarkdown(node, helpers) {
    return `<dt>${helpers.renderChildren(node)}</dt>`;
  },
});

export const DefinitionDescription = Node.create({
  name: "definitionDescription",

  content: "block+",

  parseHTML() {
    return [{ tag: "dd" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "dd",
      mergeAttributes(HTMLAttributes, { class: "md-dd" }),
      0,
    ];
  },

  renderMarkdown(node, helpers) {
    return `<dd>${helpers.renderChildren(node)}</dd>`;
  },
});

export const DefinitionList = Node.create({
  name: "definitionList",

  group: "block",

  content: "(definitionTerm definitionDescription)+",

  parseHTML() {
    return [{ tag: "dl" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "dl",
      mergeAttributes(HTMLAttributes, { class: "md-definition-list" }),
      0,
    ];
  },

  renderMarkdown(node, helpers) {
    const chunks = (node.content ?? []).map((child: JSONContent, index: number) => {
      return helpers.renderChild?.(child, index) ?? helpers.renderChildren([child]);
    });

    return `<dl>\n${chunks.join("\n")}\n</dl>`;
  },

  addCommands() {
    return {
      insertDefinitionList:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: "definitionTerm",
                  content: [{ type: "text", text: "Term" }],
                },
                {
                  type: "definitionDescription",
                  content: [{ type: "paragraph" }],
                },
              ],
            })
            .run(),
    };
  },
});

export function insertDefinitionList(editor: Editor) {
  return editor.chain().focus().insertDefinitionList().run();
}

export function createDefinitionListInputRule() {
  return new InputRule({
    find: /^:\s$/,
    handler: ({ state, range }) => {
      const definitionListType = state.schema.nodes.definitionList;
      const definitionTermType = state.schema.nodes.definitionTerm;
      const definitionDescriptionType = state.schema.nodes.definitionDescription;
      const paragraphType = state.schema.nodes.paragraph;

      if (
        !definitionListType ||
        !definitionTermType ||
        !definitionDescriptionType ||
        !paragraphType
      ) {
        return null;
      }

      const $from = state.doc.resolve(range.from);
      const blockDepth = $from.depth;
      const blockIndex = $from.index(blockDepth);
      if (blockIndex === 0) {
        return null;
      }

      const parent = $from.node(blockDepth);
      const previous = parent.child(blockIndex - 1);
      if (previous.type.name !== "paragraph") {
        return null;
      }

      const termText = previous.textContent.trim();
      if (!termText) {
        return null;
      }

      let prevFrom = $from.start(blockDepth);
      for (let index = 0; index < blockIndex - 1; index += 1) {
        prevFrom += parent.child(index).nodeSize;
      }
      const currentTo = range.to;

      const definitionList = definitionListType.create({}, [
        definitionTermType.create({}, [state.schema.text(termText)]),
        definitionDescriptionType.create({}, [paragraphType.create()]),
      ]);

      const { tr } = state;
      tr.replaceWith(prevFrom, currentTo, definitionList);
    },
  });
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    definitionList: {
      insertDefinitionList: () => ReturnType;
    };
  }
}
