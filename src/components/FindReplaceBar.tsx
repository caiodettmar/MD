import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useEditorStore } from "../stores/editorStore";

interface FindReplaceBarProps {
  editor: Editor;
}

interface MatchRange {
  from: number;
  to: number;
}

const findHighlightKey = new PluginKey<DecorationSet>("findHighlight");

interface HighlightMeta {
  matches: MatchRange[];
  currentIndex: number;
}

function buildDecorations(
  doc: PMNode,
  matches: MatchRange[],
  currentIndex: number,
): DecorationSet {
  const decorations = matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class:
        index === currentIndex
          ? "find-match find-match--current"
          : "find-match",
    }),
  );
  return DecorationSet.create(doc, decorations);
}

function createFindHighlightPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: findHighlightKey,
    state: {
      init: () => DecorationSet.empty,
      apply: (tr, value) => {
        const meta = tr.getMeta(findHighlightKey) as
          | HighlightMeta
          | undefined;
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

const SCROLL_MARGIN_PX = 48;

function scrollMatchIntoView(editor: Editor, match: MatchRange) {
  if (editor.isDestroyed) {
    return;
  }

  editor
    .chain()
    .setTextSelection({ from: match.from, to: match.to })
    .scrollIntoView()
    .run();

  // ProseMirror scrollIntoView can miss when the scroll parent is the zoomed
  // .md-editor-shell wrapper instead of the document.
  requestAnimationFrame(() => {
    if (editor.isDestroyed) {
      return;
    }

    const view = editor.view;
    const start = view.coordsAtPos(match.from);
    const end = view.coordsAtPos(match.to);
    const shell = view.dom.closest<HTMLElement>(".md-editor-shell");
    if (!shell) {
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const matchTop = Math.min(start.top, end.top);
    const matchBottom = Math.max(start.bottom, end.bottom);

    if (matchTop < shellRect.top + SCROLL_MARGIN_PX) {
      shell.scrollTop += matchTop - shellRect.top - SCROLL_MARGIN_PX;
    } else if (matchBottom > shellRect.bottom - SCROLL_MARGIN_PX) {
      shell.scrollTop += matchBottom - shellRect.bottom + SCROLL_MARGIN_PX;
    }
  });
}

function findMatches(doc: PMNode, query: string): MatchRange[] {
  const results: MatchRange[] = [];
  if (!query) {
    return results;
  }

  const needle = query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const haystack = node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + needle.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
  });

  return results;
}

export function FindReplaceBar({ editor }: FindReplaceBarProps) {
  const replaceMode = useEditorStore((state) => state.findBarReplaceMode);
  const openFindBar = useEditorStore((state) => state.openFindBar);
  const closeFindBar = useEditorStore((state) => state.closeFindBar);

  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<MatchRange[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    const plugin = createFindHighlightPlugin();
    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin(findHighlightKey);
    };
  }, [editor]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [replaceMode]);

  const publishHighlights = useCallback(
    (nextMatches: MatchRange[], nextIndex: number) => {
      if (editor.isDestroyed) {
        return;
      }
      const tr = editor.state.tr.setMeta(findHighlightKey, {
        matches: nextMatches,
        currentIndex: nextIndex,
      } satisfies HighlightMeta);
      editor.view.dispatch(tr);
    },
    [editor],
  );

  const recompute = useCallback(
    (nextQuery: string, preferredIndex: number) => {
      const nextMatches = findMatches(editor.state.doc, nextQuery);
      const nextIndex =
        nextMatches.length === 0
          ? 0
          : Math.min(Math.max(preferredIndex, 0), nextMatches.length - 1);
      setMatches(nextMatches);
      setCurrentIndex(nextIndex);
      publishHighlights(nextMatches, nextIndex);
      return { nextMatches, nextIndex };
    },
    [editor, publishHighlights],
  );

  useEffect(() => {
    const handleUpdate = () => {
      const nextMatches = findMatches(editor.state.doc, queryRef.current);
      const nextIndex =
        nextMatches.length === 0
          ? 0
          : Math.min(currentIndex, nextMatches.length - 1);
      setMatches(nextMatches);
      setCurrentIndex(nextIndex);
      publishHighlights(nextMatches, nextIndex);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [currentIndex, editor, publishHighlights]);

  const revealMatch = useCallback(
    (match: MatchRange | undefined) => {
      if (!match) {
        return;
      }
      scrollMatchIntoView(editor, match);
    },
    [editor],
  );

  const goTo = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) {
        return;
      }
      const nextIndex =
        (currentIndex + direction + matches.length) % matches.length;
      setCurrentIndex(nextIndex);
      publishHighlights(matches, nextIndex);
      revealMatch(matches[nextIndex]);
    },
    [currentIndex, matches, publishHighlights, revealMatch],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      const { nextMatches, nextIndex } = recompute(value, 0);
      revealMatch(nextMatches[nextIndex]);
    },
    [recompute, revealMatch],
  );

  const handleClose = useCallback(() => {
    publishHighlights([], 0);
    closeFindBar();
    editor.commands.focus();
  }, [closeFindBar, editor, publishHighlights]);

  const replaceCurrent = useCallback(() => {
    const match = matches[currentIndex];
    if (!match) {
      return;
    }

    const { tr } = editor.state;
    if (replacement) {
      tr.insertText(replacement, match.from, match.to);
    } else {
      tr.delete(match.from, match.to);
    }
    editor.view.dispatch(tr);

    const { nextMatches, nextIndex } = recompute(query, currentIndex);
    revealMatch(nextMatches[nextIndex]);
  }, [currentIndex, editor, matches, query, recompute, replacement]);

  const replaceAll = useCallback(() => {
    if (matches.length === 0) {
      return;
    }

    const { tr } = editor.state;
    [...matches]
      .sort((a, b) => b.from - a.from)
      .forEach((match) => {
        if (replacement) {
          tr.insertText(replacement, match.from, match.to);
        } else {
          tr.delete(match.from, match.to);
        }
      });
    editor.view.dispatch(tr);
    const { nextMatches, nextIndex } = recompute(query, 0);
    revealMatch(nextMatches[nextIndex]);
  }, [editor, matches, query, recompute, replacement, revealMatch]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        goTo(event.shiftKey ? -1 : 1);
      }
    },
    [goTo, handleClose],
  );

  return (
    <div className="find-bar" role="search">
      <div className="find-bar__row">
        <input
          ref={inputRef}
          type="text"
          className="find-bar__input"
          placeholder="Find"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="find-bar__count">
          {matches.length === 0
            ? query
              ? "0/0"
              : ""
            : `${currentIndex + 1}/${matches.length}`}
        </span>
        <button
          type="button"
          className="find-bar__button"
          title="Previous match (Shift+Enter)"
          disabled={matches.length === 0}
          onClick={() => goTo(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="find-bar__button"
          title="Next match (Enter)"
          disabled={matches.length === 0}
          onClick={() => goTo(1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="find-bar__button"
          title={replaceMode ? "Hide replace" : "Show replace (Ctrl+H)"}
          onClick={() => openFindBar(!replaceMode)}
        >
          ⇄
        </button>
        <button
          type="button"
          className="find-bar__button"
          title="Close (Escape)"
          onClick={handleClose}
        >
          ✕
        </button>
      </div>
      {replaceMode ? (
        <div className="find-bar__row">
          <input
            type="text"
            className="find-bar__input"
            placeholder="Replace with"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="find-bar__button find-bar__button--wide"
            disabled={matches.length === 0}
            onClick={replaceCurrent}
          >
            Replace
          </button>
          <button
            type="button"
            className="find-bar__button find-bar__button--wide"
            disabled={matches.length === 0}
            onClick={replaceAll}
          >
            All
          </button>
        </div>
      ) : null}
    </div>
  );
}
