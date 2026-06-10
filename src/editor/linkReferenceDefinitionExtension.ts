import { InputRule, Node, mergeAttributes } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import {
  getReferenceDefinitionHref,
  LINK_REF_DEF_CONFIRM_META,
  LINK_REF_DEF_OPEN_DIALOG_META,
  LINK_REF_DEF_RETURN_BLOCK_INDEX_META,
  parseLinkReferenceDefinitionBody,
  reorderReferenceDefinitions,
  selectionPosInTopLevelBlock,
} from "./linkReferenceDefinitionUtils";
import {
  requestReferenceDefinitionDialog,
  type ReferenceDefinitionDialogRequest,
} from "./referenceDefinitionDialogBridge";

export {
  collectLinkReferenceDefinitions,
  parseLinkReferenceDefinitionBody,
} from "./linkReferenceDefinitionUtils";

const LINK_REF_DEF_OPEN =
  /^\[(?!\^)([^\]\n]+)\]:\s+(\S+)(?:\s+"([^"]*)")?\s?/;

const LINK_REF_DEF_PARTIAL = /^\[(?!\^)([^\]\n]+)\]:\s?/;

function definitionBodyText(href: string, title: string | null): string {
  return title ? `${href} "${title}"` : href;
}

function parseLinkReferenceDefinition(src: string): {
  id: string;
  href: string;
  title: string | null;
  raw: string;
} | null {
  const match = LINK_REF_DEF_OPEN.exec(src);
  if (match) {
    const id = match[1]?.trim() ?? "";
    const href = match[2]?.trim() ?? "";
    if (!id || !href) {
      return null;
    }

    return {
      id,
      href,
      title: match[3]?.trim() || null,
      raw: match[0],
    };
  }

  const partial = LINK_REF_DEF_PARTIAL.exec(src);
  if (!partial) {
    return null;
  }

  const id = partial[1]?.trim() ?? "";
  if (!id) {
    return null;
  }

  const raw = partial[0];
  const nextChar = src.charAt(raw.length);
  if (nextChar && !/\s/u.test(nextChar)) {
    return null;
  }

  return {
    id,
    href: "",
    title: null,
    raw,
  };
}

function insertConfirmedDefinitionInTransaction(
  state: EditorState,
  id: string,
  href: string,
  title: string | null,
  returnBlockIndex: number,
): boolean {
  const defType = state.schema.nodes.linkReferenceDefinition;
  const paragraphType = state.schema.nodes.paragraph;
  if (!defType || !paragraphType) {
    return false;
  }

  const body = definitionBodyText(href, title);
  const paragraph = paragraphType.create(null, state.schema.text(body));
  const defNode = defType.create(
    {
      id,
      href,
      title,
      confirmed: true,
    },
    paragraph,
  );

  state.tr.insert(state.tr.doc.content.size, defNode);
  state.tr.setMeta(LINK_REF_DEF_CONFIRM_META, true);
  state.tr.setMeta(LINK_REF_DEF_RETURN_BLOCK_INDEX_META, returnBlockIndex);
  reorderReferenceDefinitions(state.tr, state.tr.doc);
  const nextSelection = selectionPosInTopLevelBlock(
    state.tr.doc,
    returnBlockIndex,
  );
  state.tr.setSelection(TextSelection.create(state.tr.doc, nextSelection));
  state.tr.scrollIntoView();
  return true;
}

const linkReferenceDefinitionDialogKey = new PluginKey(
  "linkReferenceDefinitionDialog",
);

export const LinkReferenceDefinitionExtension = Node.create({
  name: "linkReferenceDefinition",

  priority: 1000,

  group: "block",
  content: "paragraph",
  defining: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-ref-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-link-ref-id": attributes.id,
          };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-ref-href"),
        renderHTML: (attributes) => {
          if (!attributes.href) {
            return {};
          }

          return {
            "data-link-ref-href": attributes.href,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-ref-title"),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }

          return {
            "data-link-ref-title": attributes.title,
          };
        },
      },
      confirmed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-link-ref-confirmed") === "true",
        renderHTML: (attributes) => {
          if (!attributes.confirmed) {
            return {};
          }

          return {
            "data-link-ref-confirmed": "true",
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-link-reference-definition="true"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const resolved = Boolean(getReferenceDefinitionHref(node));

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-link-reference-definition": "true",
        "data-link-ref-id": node.attrs.id,
        "data-link-ref-href": node.attrs.href,
        "data-link-ref-title": node.attrs.title,
        "data-link-ref-resolved": resolved ? "true" : "false",
        class: "md-link-ref-definition",
      }),
      ["div", { class: "md-link-ref-definition__content" }, 0],
    ];
  },

  renderMarkdown(node, helpers) {
    const id = String(node.attrs?.id ?? "");
    const storedHref = String(node.attrs?.href ?? "").trim();
    const storedTitle = node.attrs?.title ? String(node.attrs.title) : null;

    if (storedHref) {
      return storedTitle
        ? `[${id}]: ${storedHref} "${storedTitle}"`
        : `[${id}]: ${storedHref}`;
    }

    const body = helpers.renderChildren(node).trim();
    if (!body) {
      return `[${id}]:`;
    }

    const parsed = parseLinkReferenceDefinitionBody(body);
    return parsed.title
      ? `[${id}]: ${parsed.href} "${parsed.title}"`
      : `[${id}]: ${parsed.href}`;
  },

  parseMarkdown(token, helpers) {
    const id = String(token.meta?.id ?? "");
    const href = String(token.meta?.href ?? "");
    const title = token.meta?.title ? String(token.meta.title) : null;
    const body = definitionBodyText(href, title);

    return helpers.createNode(
      "linkReferenceDefinition",
      { id, href, title, confirmed: Boolean(href) },
      [
        {
          type: "paragraph",
          content: body ? [{ type: "text", text: body }] : [],
        },
      ],
    );
  },

  markdownTokenizer: {
    name: "linkReferenceDefinition",
    level: "block",
    start(src) {
      const match = LINK_REF_DEF_PARTIAL.exec(src);
      return match?.index ?? -1;
    },
    tokenize(src) {
      const parsed = parseLinkReferenceDefinition(src);
      if (!parsed) {
        return undefined;
      }

      return {
        type: "linkReferenceDefinition",
        raw: parsed.raw,
        meta: {
          id: parsed.id,
          href: parsed.href,
          title: parsed.title,
        },
      };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[(?!\^)([^\]\n]+)\]:\s$/,
        handler: ({ state, range, match }) => {
          const id = match[1]?.trim();
          if (!id) {
            return null;
          }

          const $from = state.doc.resolve(range.from);
          const returnBlockIndex = $from.index(1);

          state.tr.delete(range.from, range.to);
          state.tr.setSelection(
            TextSelection.create(state.tr.doc, range.from),
          );
          state.tr.setMeta(LINK_REF_DEF_OPEN_DIALOG_META, {
            id,
            returnBlockIndex,
          } satisfies ReferenceDefinitionDialogRequest);

          return undefined;
        },
      }),
      new InputRule({
        find: /^\[(?!\^)([^\]\n]+)\]:\s+(\S+)(?:\s+"([^"]*)")?\s?$/,
        handler: ({ state, range, match }) => {
          const id = match[1]?.trim();
          const href = match[2]?.trim();
          const title = match[3]?.trim() || null;
          if (!id || !href) {
            return null;
          }

          const $from = state.doc.resolve(range.from);
          const returnBlockIndex = $from.index(1);

          state.tr.delete(range.from, range.to);
          return insertConfirmedDefinitionInTransaction(
            state,
            id,
            href,
            title,
            returnBlockIndex,
          )
            ? undefined
            : null;
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkReferenceDefinitionDialogKey,
        appendTransaction: (transactions) => {
          for (const transaction of transactions) {
            const request = transaction.getMeta(
              LINK_REF_DEF_OPEN_DIALOG_META,
            ) as ReferenceDefinitionDialogRequest | undefined;
            if (request?.id) {
              queueMicrotask(() => requestReferenceDefinitionDialog(request));
            }
          }

          return null;
        },
      }),
    ];
  },
});
