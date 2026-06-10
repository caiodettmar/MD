import { Extension } from "@tiptap/core";
import type { MarkType, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import {
  isInsideLinkReferenceDefinition,
  isReferenceDefinitionConfirmed,
  LINK_REF_DEF_CONFIRM_META,
  LINK_REF_DEF_RETURN_BLOCK_INDEX_META,
  parseLinkReferenceDefinitionBody,
  plainReferenceDefinitionBody,
  reorderReferenceDefinitions,
  selectionPosInTopLevelBlock,
} from "./linkReferenceDefinitionUtils";

function normalizeHref(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeTitle(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function definitionContainsLinkMark(
  node: ProseMirrorNode,
  linkMark: MarkType,
): boolean {
  let found = false;

  node.descendants((child) => {
    if (found || !child.isText) {
      return !found;
    }

    if (child.marks.some((mark) => mark.type === linkMark)) {
      found = true;
      return false;
    }

    return true;
  });

  return found;
}

const linkReferenceDefinitionMaintainKey = new PluginKey(
  "linkReferenceDefinitionMaintain",
);

export const LinkReferenceDefinitionMaintain = Extension.create({
  name: "linkReferenceDefinitionMaintain",

  priority: 1001,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkReferenceDefinitionMaintainKey,
        state: {
          init() {
            return { locked: false };
          },
          apply(tr, value) {
            if (tr.getMeta("linkReferenceDefinitionMaintain")) {
              return { locked: true };
            }

            if (!tr.getMeta("appendedTransaction")) {
              return { locked: false };
            }

            return value;
          },
        },
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some(
            (transaction) => transaction.docChanged,
          );
          if (!docChanged) {
            return null;
          }

          if (linkReferenceDefinitionMaintainKey.getState(newState)?.locked) {
            return null;
          }

          const defType = newState.schema.nodes.linkReferenceDefinition;
          const paragraphType = newState.schema.nodes.paragraph;
          const linkMark = newState.schema.marks.link;

          if (!defType || !paragraphType) {
            return null;
          }

          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (!node.isText || !linkMark) {
              return true;
            }

            if (!isInsideLinkReferenceDefinition(newState.doc, pos)) {
              return true;
            }

            const hasLink = node.marks.some((mark) => mark.type === linkMark);
            if (!hasLink) {
              return true;
            }

            tr.removeMark(pos, pos + node.nodeSize, linkMark);
            changed = true;
            return true;
          });

          newState.doc.descendants((node, pos) => {
            if (node.type !== defType) {
              return true;
            }

            if (!isReferenceDefinitionConfirmed(node)) {
              const paragraph = paragraphType.create();
              tr.replaceWith(pos, pos + node.nodeSize, paragraph);
              changed = true;
              return false;
            }

            const parsed = parseLinkReferenceDefinitionBody(
              node.textContent.trim(),
            );
            const nextHref = parsed.href || null;
            const nextTitle = parsed.title;
            const currentHref = node.attrs.href
              ? normalizeHref(node.attrs.href)
              : null;
            const currentTitle = normalizeTitle(node.attrs.title);
            const normalizedNextHref = nextHref ? normalizeHref(nextHref) : null;

            if (
              normalizedNextHref !== currentHref ||
              nextTitle !== currentTitle
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                href: normalizedNextHref,
                title: nextTitle,
                confirmed: true,
              });
              changed = true;
            }

            if (linkMark && definitionContainsLinkMark(node, linkMark)) {
              const body = plainReferenceDefinitionBody(node);
              const paragraph = body
                ? paragraphType.create(null, newState.schema.text(body))
                : paragraphType.create();
              const innerFrom = pos + 1;
              const innerTo = pos + node.nodeSize - 1;
              const currentInner = tr.doc.slice(innerFrom, innerTo);
              const nextInner = Fragment.from(paragraph);
              if (!currentInner.content.eq(nextInner)) {
                tr.replaceWith(innerFrom, innerTo, paragraph);
                changed = true;
              }
            }

            return false;
          });

          const shouldReorder = transactions.some((transaction) =>
            transaction.getMeta(LINK_REF_DEF_CONFIRM_META),
          );
          const returnBlockIndex = transactions.reduce<number | null>(
            (found, transaction) => {
              const value = transaction.getMeta(
                LINK_REF_DEF_RETURN_BLOCK_INDEX_META,
              );
              return typeof value === "number" ? value : found;
            },
            null,
          );

          const reordered =
            shouldReorder && reorderReferenceDefinitions(tr, tr.doc);
          if (reordered) {
            changed = true;
          }

          if (returnBlockIndex !== null && shouldReorder) {
            const selectionPos = selectionPosInTopLevelBlock(
              tr.doc,
              returnBlockIndex,
            );
            tr.setSelection(TextSelection.create(tr.doc, selectionPos));
            tr.scrollIntoView();
            changed = true;
          }

          if (!changed) {
            return null;
          }

          tr.setMeta("preventAutolink", true);
          tr.setMeta("linkReferenceDefinitionMaintain", true);
          return tr;
        },
      }),
    ];
  },
});
