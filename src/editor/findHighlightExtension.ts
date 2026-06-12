import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { TextRange } from "../lib/markdownPaneSync";

export const findHighlightKey = new PluginKey<DecorationSet>("findHighlight");

interface HighlightMeta {
  matches: TextRange[];
  currentIndex: number;
}

function buildDecorations(
  doc: PMNode,
  matches: TextRange[],
  currentIndex: number,
): DecorationSet {
  const docSize = doc.content.size;
  const decorations = matches
    .map((match, index) => {
      const from = Math.max(1, Math.min(docSize - 1, match.from));
      const to = Math.max(from + 1, Math.min(docSize, match.to));
      if (from >= to) {
        return null;
      }

      const isCurrent = index === currentIndex;
      return Decoration.inline(from, to, {
        class: isCurrent ? "find-match find-match--current" : "find-match",
        style: isCurrent
          ? "background-color: rgba(249, 115, 22, 0.6); border-radius: 2px;"
          : "background-color: rgba(250, 204, 21, 0.45); border-radius: 2px;",
      });
    })
    .filter((decoration): decoration is Decoration => decoration !== null);

  return decorations.length
    ? DecorationSet.create(doc, decorations)
    : DecorationSet.empty;
}

function createFindHighlightPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: findHighlightKey,
    state: {
      init: () => DecorationSet.empty,
      apply: (tr, value) => {
        const meta = tr.getMeta(findHighlightKey) as HighlightMeta | undefined;
        if (meta) {
          return buildDecorations(tr.doc, meta.matches, meta.currentIndex);
        }
        return value.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return findHighlightKey.getState(state) ?? DecorationSet.empty;
      },
    },
  });
}

export const FindHighlightExtension = Extension.create({
  name: "findHighlight",
  addProseMirrorPlugins() {
    return [createFindHighlightPlugin()];
  },
});

export function publishFindHighlights(
  editor: Editor,
  matches: TextRange[],
  currentIndex: number,
) {
  if (editor.isDestroyed) {
    return;
  }

  const tr = editor.state.tr
    .setMeta(findHighlightKey, {
      matches,
      currentIndex,
    } satisfies HighlightMeta)
    .setMeta("addToHistory", false);

  editor.view.dispatch(tr);
}

export function clearFindHighlights(editor: Editor) {
  publishFindHighlights(editor, [], 0);
}
