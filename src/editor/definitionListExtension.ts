import { InputRule, Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

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
    return helpers.renderChildren(node);
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
    const body = helpers.renderChildren(node).trimEnd();
    return body ? `: ${body}` : ":";
  },
});

interface ParsedDefinitionGroup {
  term: string;
  tokens: JSONContent[];
}

function isDefinitionTermLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (/^\[\^/.test(trimmed)) {
    return false;
  }

  if (/^\[(?!\^)([^\]]+)\]:\s*/.test(trimmed)) {
    return false;
  }

  if (/^#{1,6}\s/.test(trimmed)) {
    return false;
  }

  if (/^>\s/.test(trimmed)) {
    return false;
  }

  if (/^[-*+]\s/.test(trimmed)) {
    return false;
  }

  if (/^\d+\.\s/.test(trimmed)) {
    return false;
  }

  if (/^\|/.test(trimmed)) {
    return false;
  }

  if (/^```/.test(trimmed)) {
    return false;
  }

  if (/^---+\s*$/.test(trimmed)) {
    return false;
  }

  if (/^\[TOC\]$/i.test(trimmed)) {
    return false;
  }

  if (/^:\s?/.test(trimmed)) {
    return false;
  }

  return true;
}

function parseDefinitionListBlock(src: string): {
  raw: string;
  groups: Array<{ term: string; definitionLines: string[] }>;
} | null {
  const lines = src.split("\n");
  let index = 0;
  const groups: Array<{ term: string; definitionLines: string[] }> = [];
  const rawLines: string[] = [];

  while (index < lines.length) {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    const termLine = lines[index];
    if (!isDefinitionTermLine(termLine)) {
      break;
    }

    const term = termLine.trimEnd();
    index += 1;
    rawLines.push(termLine);

    const definitionLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index];
      const definitionMatch = /^(\s*):(?:\s+(.*)|\s*)$/.exec(line);
      if (!definitionMatch) {
        break;
      }

      definitionLines.push(definitionMatch[2] ?? "");
      rawLines.push(line);
      index += 1;
    }

    if (definitionLines.length === 0) {
      if (groups.length === 0) {
        return null;
      }
      break;
    }

    groups.push({ term: term.trim(), definitionLines });
  }

  if (groups.length === 0) {
    return null;
  }

  return { raw: rawLines.join("\n"), groups };
}

export const DefinitionList = Node.create({
  name: "definitionList",

  group: "block",

  content: "(definitionTerm definitionDescription)+",

  priority: 1000,

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
    const children = node.content ?? [];
    const chunks: string[] = [];

    for (let index = 0; index < children.length; index += 2) {
      const term = children[index];
      const description = children[index + 1];
      if (!term || !description) {
        continue;
      }

      const termText =
        helpers.renderChild?.(term, index) ??
        helpers.renderChildren([term]).trimEnd();
      const definitionText =
        helpers.renderChild?.(description, index + 1) ??
        helpers.renderChildren([description]).trimEnd();

      chunks.push(`${termText}\n${definitionText}`);
    }

    return chunks.join("\n\n");
  },

  parseMarkdown(token, helpers) {
    const groups = (token.meta?.groups as ParsedDefinitionGroup[] | undefined) ?? [];
    const content = groups.flatMap((group) => [
      {
        type: "definitionTerm",
        content: group.term ? [{ type: "text", text: group.term }] : [],
      },
      {
        type: "definitionDescription",
        content: helpers.parseChildren(group.tokens ?? []),
      },
    ]);

    return helpers.createNode("definitionList", {}, content);
  },

  markdownTokenizer: {
    name: "definitionList",
    level: "block",
    start(src) {
      const lines = src.split("\n");
      for (let index = 0; index < lines.length - 1; index += 1) {
        const termLine = lines[index];
        const nextLine = lines[index + 1];
        if (
          isDefinitionTermLine(termLine) &&
          /^(\s*):(?:\s|$)/.test(nextLine)
        ) {
          return src.indexOf(termLine);
        }
      }

      return -1;
    },
    tokenize(src, _tokens, lexer) {
      const parsed = parseDefinitionListBlock(src);
      if (!parsed) {
        return undefined;
      }

      const groups: ParsedDefinitionGroup[] = parsed.groups.map((group) => ({
        term: group.term,
        tokens: lexer.blockTokens(group.definitionLines.join("\n") || " "),
      }));

      return {
        type: "definitionList",
        raw: parsed.raw,
        meta: { groups },
      };
    },
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
      const depth = $from.depth;
      const blockIndex = $from.index(depth - 1);
      if (blockIndex === 0) {
        return null;
      }

      const parent = $from.node(depth - 1);
      const previous = parent.child(blockIndex - 1);
      if (previous.type.name !== "paragraph") {
        return null;
      }

      const termText = previous.textContent.trim();
      if (!termText) {
        return null;
      }

      const termStart = $from.before(depth) - previous.nodeSize;
      const currentTo = range.to;

      const definitionList = definitionListType.create({}, [
        definitionTermType.create({}, [state.schema.text(termText)]),
        definitionDescriptionType.create({}, [paragraphType.create()]),
      ]);

      state.tr.replaceWith(termStart, currentTo, definitionList);

      const dt = definitionList.child(0);
      const cursorPos = termStart + 1 + dt.nodeSize + 2;
      state.tr.setSelection(TextSelection.create(state.tr.doc, cursorPos));
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
