import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

export function isCompleteReferenceDefinitionHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.length < 4) {
    return false;
  }

  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\/(.+)/i.exec(trimmed);
  if (schemeMatch) {
    return schemeMatch[2].length > 0;
  }

  if (/^mailto:.+@.+/i.test(trimmed)) {
    return true;
  }

  if (/^\/[^\s/][^\s]*$/.test(trimmed)) {
    return true;
  }

  if (/^\S+\.\S+$/.test(trimmed) && !/\s/u.test(trimmed)) {
    return true;
  }

  return false;
}

export function isInsideLinkReferenceDefinition(
  doc: ProseMirrorNode,
  position: number,
): boolean {
  const $pos = doc.resolve(position);

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "linkReferenceDefinition") {
      return true;
    }
  }

  return false;
}

export function parseLinkReferenceDefinitionBody(text: string): {
  href: string;
  title: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { href: "", title: null };
  }

  const titled = /^(\S+)\s+"([^"]*)"$/.exec(trimmed);
  if (titled) {
    return {
      href: titled[1]?.trim() ?? "",
      title: titled[2]?.trim() || null,
    };
  }

  return { href: trimmed, title: null };
}

function definitionBodyText(href: string, title: string | null): string {
  return title ? `${href} "${title}"` : href;
}

export function collectLinkReferenceDefinitions(
  doc: EditorState["doc"],
): Map<string, { href: string; title: string | null }> {
  const map = new Map<string, { href: string; title: string | null }>();

  doc.descendants((node) => {
    if (node.type.name !== "linkReferenceDefinition") {
      return true;
    }

    const id = String(node.attrs.id ?? "").trim();
    if (!id) {
      return false;
    }

    const href = getReferenceDefinitionHref(node);
    if (!href) {
      return false;
    }

    map.set(id.toLowerCase(), {
      href,
      title: getReferenceDefinitionTitle(node),
    });

    return false;
  });

  return map;
}

export interface LinkReferenceDefinitionEntry {
  pos: number;
  id: string;
  href: string;
  title: string | null;
  complete: boolean;
}

export function isReferenceDefinitionConfirmed(
  node: ProseMirrorNode,
): boolean {
  return node.attrs.confirmed === true;
}

export function getReferenceDefinitionHref(node: ProseMirrorNode): string {
  if (!isReferenceDefinitionConfirmed(node)) {
    return "";
  }

  const stored = String(node.attrs.href ?? "").trim();
  if (stored) {
    return stored;
  }

  return parseLinkReferenceDefinitionBody(node.textContent.trim()).href;
}

export function getReferenceDefinitionTitle(
  node: ProseMirrorNode,
): string | null {
  if (!getReferenceDefinitionHref(node)) {
    return null;
  }

  const stored = node.attrs.title ? String(node.attrs.title) : null;
  if (stored) {
    return stored;
  }

  return parseLinkReferenceDefinitionBody(node.textContent.trim()).title;
}

export function listLinkReferenceDefinitions(
  doc: EditorState["doc"],
): LinkReferenceDefinitionEntry[] {
  const entries: LinkReferenceDefinitionEntry[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== "linkReferenceDefinition") {
      return true;
    }

    const id = String(node.attrs.id ?? "").trim();
    const href = getReferenceDefinitionHref(node);
    const title = getReferenceDefinitionTitle(node);

    entries.push({
      pos,
      id,
      href,
      title,
      complete:
        isReferenceDefinitionConfirmed(node) &&
        Boolean(getReferenceDefinitionHref(node)),
    });

    return false;
  });

  return entries;
}

export function updateLinkReferenceDefinition(
  editor: Editor,
  pos: number,
  next: { id: string; href: string; title: string | null },
): boolean {
  const id = next.id.trim();
  const href = next.href.trim();
  const title = next.title?.trim() || null;

  if (!id || !href) {
    return false;
  }

  return editor.commands.command(({ state, tr, dispatch }) => {
    const node = state.doc.nodeAt(pos);
    const defType = state.schema.nodes.linkReferenceDefinition;
    const paragraphType = state.schema.nodes.paragraph;

    if (!node || node.type !== defType || !paragraphType) {
      return false;
    }

    const body = definitionBodyText(href, title);
    const paragraph = paragraphType.create(null, state.schema.text(body));

    tr.setNodeMarkup(pos, undefined, {
      id,
      href,
      title,
      confirmed: true,
    });

    const innerFrom = pos + 1;
    const innerTo = pos + node.nodeSize - 1;
    tr.replaceWith(innerFrom, innerTo, paragraph);

    if (dispatch) {
      dispatch(tr);
    }

    return true;
  });
}

export function removeLinkReferenceDefinition(
  editor: Editor,
  pos: number,
): boolean {
  return editor.commands.command(({ state, tr, dispatch }) => {
    const node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== "linkReferenceDefinition") {
      return false;
    }

    tr.delete(pos, pos + node.nodeSize);

    if (dispatch) {
      dispatch(tr);
    }

    return true;
  });
}

export function insertConfirmedReferenceDefinition(
  editor: Editor,
  input: {
    id: string;
    href: string;
    title: string | null;
    returnBlockIndex: number;
  },
): boolean {
  const id = input.id.trim();
  const href = input.href.trim();
  const title = input.title?.trim() || null;

  if (!id || !href) {
    return false;
  }

  return editor
    .chain()
    .command(({ state, tr, dispatch }) => {
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

      tr.insert(tr.doc.content.size, defNode);
      tr.setMeta(LINK_REF_DEF_CONFIRM_META, true);
      tr.setMeta(LINK_REF_DEF_RETURN_BLOCK_INDEX_META, input.returnBlockIndex);

      if (dispatch) {
        dispatch(tr);
      }

      return true;
    })
    .focus()
    .run();
}

export function addLinkReferenceDefinition(
  editor: Editor,
  id: string,
  href: string,
  title: string | null,
): boolean {
  const count = editor.state.doc.content.childCount;
  return insertConfirmedReferenceDefinition(editor, {
    id,
    href,
    title,
    returnBlockIndex: Math.max(0, count - 1),
  });
}

export const LINK_REF_DEF_CONFIRM_META = "linkReferenceDefinitionConfirm";
export const LINK_REF_DEF_OPEN_DIALOG_META = "linkReferenceDefinitionOpenDialog";
export const LINK_REF_DEF_RETURN_POS_META = "linkReferenceDefinitionReturnPos";
export const LINK_REF_DEF_RETURN_BLOCK_INDEX_META =
  "linkReferenceDefinitionReturnBlockIndex";

export function topLevelBlockIndexAtPos(
  doc: EditorState["doc"],
  pos: number,
): number {
  const clamped = Math.min(Math.max(0, pos), doc.content.size);
  const $pos = doc.resolve(clamped);
  if ($pos.depth < 1) {
    return 0;
  }

  return $pos.index(1);
}

export function selectionPosInTopLevelBlock(
  doc: EditorState["doc"],
  blockIndex: number,
): number {
  const count = doc.content.childCount;
  if (count === 0) {
    return 1;
  }

  let index = Math.min(Math.max(0, blockIndex), count - 1);
  let block = doc.content.child(index);

  while (
    index > 0 &&
    block.type.name === "linkReferenceDefinition" &&
    getReferenceDefinitionHref(block)
  ) {
    index -= 1;
    block = doc.content.child(index);
  }

  let pos = 0;
  for (let i = 0; i < index; i += 1) {
    pos += doc.content.child(i).nodeSize;
  }

  const $pos = doc.resolve(pos + 1);
  if ($pos.parent.isTextblock) {
    return $pos.pos;
  }

  return TextSelection.near(doc.resolve(pos + 1), 1).from;
}

/** @deprecated Use selectionPosInTopLevelBlock */
export function selectionPosAtTopLevelBlockIndex(
  doc: EditorState["doc"],
  blockIndex: number,
): number {
  return selectionPosInTopLevelBlock(doc, blockIndex);
}

function buildReferenceDefinitionDocumentOrder(
  doc: EditorState["doc"],
): Fragment | null {
  const leading: ProseMirrorNode[] = [];
  const complete: ProseMirrorNode[] = [];

  doc.content.forEach((child) => {
    if (
      child.type.name === "linkReferenceDefinition" &&
      getReferenceDefinitionHref(child)
    ) {
      complete.push(child);
      return;
    }

    leading.push(child);
  });

  const ordered = [...leading, ...complete];
  if (ordered.length !== doc.content.childCount) {
    return null;
  }

  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index] !== doc.content.child(index)) {
      return Fragment.from(ordered);
    }
  }

  return null;
}

export function reorderReferenceDefinitions(
  tr: Transaction,
  doc: EditorState["doc"],
): boolean {
  const ordered = buildReferenceDefinitionDocumentOrder(doc);
  if (!ordered) {
    return false;
  }

  tr.replaceWith(0, doc.content.size, ordered);
  return true;
}

export function plainReferenceDefinitionBody(node: ProseMirrorNode): string {
  const href = getReferenceDefinitionHref(node);
  const title = getReferenceDefinitionTitle(node);
  return href ? definitionBodyText(href, title) : node.textContent;
}
