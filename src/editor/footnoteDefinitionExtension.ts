import { InputRule, Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

const FOOTNOTE_DEF_OPEN = /^\[\^([a-zA-Z0-9_-]+)\]:\s?/;

function parseFootnoteDefinitionBody(src: string): {
  id: string;
  raw: string;
  body: string;
} | null {
  const match = FOOTNOTE_DEF_OPEN.exec(src);
  if (!match) {
    return null;
  }

  const id = match[1];
  let cursor = match[0].length;
  let raw = match[0];
  const bodyLines: string[] = [];

  const readLine = (): string | null => {
    if (cursor >= src.length) {
      return null;
    }

    const lineEnd = src.indexOf("\n", cursor);
    const line = lineEnd === -1 ? src.slice(cursor) : src.slice(cursor, lineEnd);
    cursor = lineEnd === -1 ? src.length : lineEnd + 1;
    raw += line + (lineEnd === -1 ? "" : "\n");
    return line;
  };

  const firstLine = readLine();
  if (firstLine === null) {
    bodyLines.push("");
  } else {
    bodyLines.push(firstLine);
  }

  while (cursor < src.length) {
    const line = readLine();
    if (line === null) {
      break;
    }

    if (line.startsWith("    ") || line.startsWith("\t")) {
      bodyLines.push(line.replace(/^( {4}|\t)/, ""));
      continue;
    }

    if (line.trim() === "") {
      const peek = src.slice(cursor);
      if (/^( {4}|\t)/m.test(peek)) {
        bodyLines.push("");
        continue;
      }
    }

    cursor -= line.length + 1;
    raw = raw.slice(0, raw.length - line.length - 1);
    break;
  }

  return {
    id,
    raw,
    body: bodyLines.join("\n").trimEnd(),
  };
}

function renderFootnoteDefinitionBody(
  node: JSONContent,
  helpers: {
    renderChild?: (child: JSONContent, index: number) => string;
    renderChildren: (nodes: JSONContent[], separator?: string) => string;
  },
): string {
  if (!node.content?.length) {
    return "";
  }

  const chunks = node.content.map((child, index) => {
    return helpers.renderChild?.(child, index) ?? helpers.renderChildren([child]);
  });

  const lines: string[] = [];
  chunks.forEach((chunk, index) => {
    chunk.split("\n").forEach((line, lineIndex) => {
      if (index === 0 && lineIndex === 0) {
        lines.push(line);
        return;
      }

      if (line.trim() === "") {
        lines.push("");
        return;
      }

      lines.push(`    ${line}`);
    });
  });

  return lines.join("\n");
}

function replaceBlockWithFootnoteDefinition(
  state: EditorState,
  range: { from: number; to: number },
  id: string,
  initialText?: string,
): boolean {
  const footnoteDefType = state.schema.nodes.footnoteDefinition;
  const paragraphType = state.schema.nodes.paragraph;
  if (!footnoteDefType || !paragraphType) {
    return false;
  }

  const $start = state.doc.resolve(range.from);
  const depth = $start.depth;
  const blockFrom = $start.before(depth);
  const blockTo = $start.after(depth);
  const parent = $start.node(depth - 1);
  const index = $start.index(depth - 1);

  if (!parent.canReplaceWith(index, index + 1, footnoteDefType)) {
    return false;
  }

  const paragraph = initialText
    ? paragraphType.create(null, state.schema.text(initialText))
    : paragraphType.create();

  const footnoteNode = footnoteDefType.create({ id }, paragraph);

  state.tr.replaceWith(blockFrom, blockTo, footnoteNode);

  const paragraphStart = blockFrom + 2;
  const cursorPos = paragraphStart + (initialText?.length ?? 0);
  state.tr.setSelection(TextSelection.create(state.tr.doc, cursorPos));

  return true;
}

export const FootnoteDefinitionExtension = Node.create({
  name: "footnoteDefinition",

  priority: 1000,

  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-footnote-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-footnote-id": attributes.id,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-footnote-definition="true"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-definition": "true",
        "data-footnote-id": node.attrs.id,
        class: "md-footnote-definition",
      }),
      ["div", { class: "md-footnote-definition__content" }, 0],
    ];
  },

  renderMarkdown(node, helpers) {
    const id = String(node.attrs?.id ?? "");
    const body = renderFootnoteDefinitionBody(node, helpers);
    return body ? `[^${id}]: ${body}` : `[^${id}]:`;
  },

  parseMarkdown(token, helpers) {
    const id = String(token.meta?.id ?? "");
    return helpers.createNode(
      "footnoteDefinition",
      { id },
      helpers.parseChildren(token.tokens || []),
    );
  },

  markdownTokenizer: {
    name: "footnoteDefinition",
    level: "block",
    start(src) {
      const match = FOOTNOTE_DEF_OPEN.exec(src);
      return match?.index ?? -1;
    },
    tokenize(src, _tokens, lexer) {
      const parsed = parseFootnoteDefinitionBody(src);
      if (!parsed) {
        return undefined;
      }

      return {
        type: "footnoteDefinition",
        raw: parsed.raw,
        meta: { id: parsed.id },
        tokens: lexer.blockTokens(parsed.body || " "),
      };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[\^([a-zA-Z0-9_-]+)\]:\s$/,
        handler: ({ state, range, match }) => {
          const id = match[1];
          if (!id) {
            return null;
          }

          return replaceBlockWithFootnoteDefinition(state, range, id) ? undefined : null;
        },
      }),
      new InputRule({
        find: /^\[\^([a-zA-Z0-9_-]+)\]:(\S)$/,
        handler: ({ state, range, match }) => {
          const id = match[1];
          const initialText = match[2];
          if (!id || !initialText) {
            return null;
          }

          return replaceBlockWithFootnoteDefinition(state, range, id, initialText)
            ? undefined
            : null;
        },
      }),
    ];
  },
});
