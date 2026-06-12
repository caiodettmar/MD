import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Editor } from "@tiptap/react";
import {
  clearFindHighlights,
  publishFindHighlights,
} from "../editor/findHighlightExtension";
import {
  findMatchesInDoc,
  findMatchesInMarkdown,
  scrollEditorRangeIntoView,
  scrollTextareaToRange,
  type FindSearchTarget,
  type MarkdownMatch,
  type TextRange,
} from "../lib/markdownPaneSync";
import { useEditorStore } from "../stores/editorStore";
import type { RawPaneHandle } from "./RawPane";

interface FindReplaceBarProps {
  activeTabId: string;
  editor: Editor;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  rawPaneRef: React.RefObject<RawPaneHandle | null>;
  showRawPane: boolean;
}

export function FindReplaceBar({
  activeTabId,
  editor,
  markdown,
  onMarkdownChange,
  rawPaneRef,
  showRawPane,
}: FindReplaceBarProps) {
  const replaceMode = useEditorStore((state) => state.findBarReplaceMode);
  const openFindBar = useEditorStore((state) => state.openFindBar);
  const closeFindBar = useEditorStore((state) => state.closeFindBar);
  const searchTarget = useEditorStore((state) => state.findSearchTarget);
  const setFindSearchTarget = useEditorStore((state) => state.setFindSearchTarget);
  const setRawFindHighlights = useEditorStore((state) => state.setRawFindHighlights);
  const clearRawFindHighlights = useEditorStore((state) => state.clearRawFindHighlights);

  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [mdMatches, setMdMatches] = useState<MarkdownMatch[]>([]);
  const [docMatches, setDocMatches] = useState<TextRange[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(query);
  const markdownRef = useRef(markdown);
  const searchTargetRef = useRef(searchTarget);
  const searchDebounceRef = useRef<number | null>(null);
  const prevTabIdRef = useRef(activeTabId);
  queryRef.current = query;
  markdownRef.current = markdown;
  searchTargetRef.current = searchTarget;

  const effectiveSearchTarget: FindSearchTarget =
    showRawPane ? searchTarget : "editor";

  const matchCount =
    effectiveSearchTarget === "raw" ? mdMatches.length : docMatches.length;

  useEffect(() => {
    if (prevTabIdRef.current === activeTabId) {
      return;
    }

    prevTabIdRef.current = activeTabId;

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    setQuery("");
    setReplacement("");
    setMdMatches([]);
    setDocMatches([]);
    setCurrentIndex(0);
    clearRawFindHighlights();
    if (!editor.isDestroyed) {
      clearFindHighlights(editor);
    }
  }, [activeTabId, clearRawFindHighlights, editor]);

  useEffect(() => {
    if (!showRawPane && searchTarget === "raw") {
      setFindSearchTarget("editor");
    }
  }, [searchTarget, setFindSearchTarget, showRawPane]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const textarea = rawPaneRef.current?.textarea;
      const target = event.target;

      if (textarea && (target === textarea || textarea.contains(target as Node))) {
        setFindSearchTarget("raw");
        return;
      }

      if (target instanceof Node && editor.view.dom.contains(target)) {
        setFindSearchTarget("editor");
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [editor, rawPaneRef, setFindSearchTarget]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [replaceMode]);

  const revealMatch = useCallback(
    (
      index: number,
      target: FindSearchTarget,
      matches?: MarkdownMatch[] | TextRange[],
    ) => {
      if (target === "raw") {
        const list = (matches as MarkdownMatch[] | undefined) ?? mdMatches;
        const match = list[index];
        const textarea = rawPaneRef.current?.textarea;
        if (!match || !textarea) {
          return;
        }

        scrollTextareaToRange(textarea, match.start, match.end, {
          focus: false,
        });
      } else {
        const list = (matches as TextRange[] | undefined) ?? docMatches;
        const match = list[index];
        if (!match) {
          return;
        }

        scrollEditorRangeIntoView(editor, match, { focus: false });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            publishFindHighlights(editor, list, index);
            inputRef.current?.focus();
          });
        });
        return;
      }

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [docMatches, editor, mdMatches, rawPaneRef],
  );

  const recompute = useCallback(
    (
      nextQuery: string,
      nextMarkdown: string,
      target: FindSearchTarget,
      preferredIndex: number,
    ) => {
      if (!nextQuery) {
        setMdMatches([]);
        setDocMatches([]);
        setCurrentIndex(0);
        clearFindHighlights(editor);
        clearRawFindHighlights();
        return { nextIndex: 0 };
      }

      if (target === "raw") {
        const nextMdMatches = findMatchesInMarkdown(nextMarkdown, nextQuery);
        const nextIndex =
          nextMdMatches.length === 0
            ? 0
            : Math.min(Math.max(preferredIndex, 0), nextMdMatches.length - 1);

        setMdMatches(nextMdMatches);
        setDocMatches([]);
        setCurrentIndex(nextIndex);
        clearFindHighlights(editor);
        setRawFindHighlights(nextMdMatches, nextIndex);

        return { nextIndex, nextMdMatches };
      }

      const nextDocMatches = findMatchesInDoc(editor, nextQuery);
      const nextIndex =
        nextDocMatches.length === 0
          ? 0
          : Math.min(Math.max(preferredIndex, 0), nextDocMatches.length - 1);

      setMdMatches([]);
      setDocMatches(nextDocMatches);
      setCurrentIndex(nextIndex);
      clearRawFindHighlights();
      publishFindHighlights(editor, nextDocMatches, nextIndex);

      return { nextIndex, nextDocMatches };
    },
    [clearRawFindHighlights, editor, setRawFindHighlights],
  );

  const applySearch = useCallback(
    (nextQuery: string, reveal: boolean, preferredIndex = 0) => {
      const target = showRawPane ? searchTargetRef.current : "editor";
      const result = recompute(
        nextQuery,
        markdown,
        target,
        preferredIndex,
      );

      if (reveal && nextQuery) {
        const freshMatches =
          target === "raw" ? result.nextMdMatches : result.nextDocMatches;
        revealMatch(result.nextIndex, target, freshMatches);
      }

      return { nextIndex: result.nextIndex, target };
    },
    [markdown, recompute, revealMatch, showRawPane],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const nextQuery = queryRef.current;
      if (!nextQuery || searchTargetRef.current !== "editor") {
        return;
      }

      const matches = findMatchesInDoc(editor, nextQuery);
      const nextIndex =
        matches.length === 0
          ? 0
          : Math.min(currentIndex, matches.length - 1);

      setDocMatches(matches);
      setCurrentIndex(nextIndex);
      publishFindHighlights(editor, matches, nextIndex);
      clearRawFindHighlights();
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [currentIndex, editor]);

  useEffect(() => {
    if (!queryRef.current || searchTargetRef.current !== "raw") {
      return;
    }

    const matches = findMatchesInMarkdown(markdown, queryRef.current);
    const nextIndex =
      matches.length === 0 ? 0 : Math.min(currentIndex, matches.length - 1);

    setMdMatches(matches);
    setCurrentIndex(nextIndex);
    setRawFindHighlights(matches, nextIndex);
  }, [currentIndex, markdown, setRawFindHighlights]);

  const prevSearchTargetRef = useRef(effectiveSearchTarget);
  useEffect(() => {
    if (prevSearchTargetRef.current === effectiveSearchTarget) {
      return;
    }

    prevSearchTargetRef.current = effectiveSearchTarget;

    if (!queryRef.current) {
      return;
    }

    const result = recompute(
      queryRef.current,
      markdownRef.current,
      effectiveSearchTarget,
      0,
    );
    const freshMatches =
      effectiveSearchTarget === "raw"
        ? result.nextMdMatches
        : result.nextDocMatches;
    revealMatch(result.nextIndex, effectiveSearchTarget, freshMatches);
  }, [effectiveSearchTarget, recompute, revealMatch]);

  const goTo = useCallback(
    (direction: 1 | -1) => {
      if (matchCount === 0) {
        return;
      }

      const target = showRawPane ? searchTargetRef.current : "editor";
      const nextIndex = (currentIndex + direction + matchCount) % matchCount;

      if (target === "editor") {
        publishFindHighlights(editor, docMatches, nextIndex);
      } else {
        setRawFindHighlights(mdMatches, nextIndex);
      }

      setCurrentIndex(nextIndex);
      revealMatch(
        nextIndex,
        target,
        target === "raw" ? mdMatches : docMatches,
      );
    },
    [currentIndex, docMatches, editor, matchCount, mdMatches, revealMatch, setRawFindHighlights, showRawPane],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }

      if (!value) {
        recompute("", markdown, searchTargetRef.current, 0);
        return;
      }

      searchDebounceRef.current = window.setTimeout(() => {
        applySearch(value, true, 0);
        searchDebounceRef.current = null;
      }, 350);
    },
    [applySearch, markdown, recompute],
  );

  const handleClose = useCallback(() => {
    clearFindHighlights(editor);
    clearRawFindHighlights();
    closeFindBar();

    if (searchTargetRef.current === "raw") {
      rawPaneRef.current?.textarea?.focus();
      return;
    }

    editor.commands.focus();
  }, [clearRawFindHighlights, closeFindBar, editor, rawPaneRef]);

  const replaceCurrent = useCallback(() => {
    if (matchCount === 0) {
      return;
    }

    if (searchTargetRef.current === "raw") {
      const match = mdMatches[currentIndex];
      if (!match) {
        return;
      }

      const nextMarkdown =
        markdown.slice(0, match.start) +
        replacement +
        markdown.slice(match.end);
      onMarkdownChange(nextMarkdown);

      const { nextIndex, nextMdMatches } = recompute(
        query,
        nextMarkdown,
        "raw",
        currentIndex,
      );
      revealMatch(nextIndex, "raw", nextMdMatches);
      return;
    }

    const match = docMatches[currentIndex];
    if (!match) {
      return;
    }

    editor
      .chain()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replacement)
      .run();

    const nextDocMatches = findMatchesInDoc(editor, query);
    const nextIndex =
      nextDocMatches.length === 0
        ? 0
        : Math.min(currentIndex, nextDocMatches.length - 1);

    setDocMatches(nextDocMatches);
    setCurrentIndex(nextIndex);
    publishFindHighlights(editor, nextDocMatches, nextIndex);
    revealMatch(nextIndex, "editor");
  }, [
    currentIndex,
    docMatches,
    editor,
    markdown,
    matchCount,
    mdMatches,
    onMarkdownChange,
    query,
    recompute,
    replacement,
    revealMatch,
  ]);

  const replaceAll = useCallback(() => {
    if (matchCount === 0) {
      return;
    }

    if (searchTargetRef.current === "raw") {
      let nextMarkdown = markdown;
      [...mdMatches]
        .sort((a, b) => b.start - a.start)
        .forEach((match) => {
          nextMarkdown =
            nextMarkdown.slice(0, match.start) +
            replacement +
            nextMarkdown.slice(match.end);
        });

      onMarkdownChange(nextMarkdown);
      const result = recompute(query, nextMarkdown, "raw", 0);
      revealMatch(0, "raw", result.nextMdMatches);
      return;
    }

    [...docMatches]
      .sort((a, b) => b.from - a.from)
      .forEach((match) => {
        editor
          .chain()
          .setTextSelection({ from: match.from, to: match.to })
          .insertContent(replacement)
          .run();
      });

    const nextDocMatches = findMatchesInDoc(editor, query);
    setDocMatches(nextDocMatches);
    setCurrentIndex(0);
    publishFindHighlights(editor, nextDocMatches, 0);
    revealMatch(0, "editor");
  }, [
    docMatches,
    editor,
    markdown,
    matchCount,
    mdMatches,
    onMarkdownChange,
    query,
    recompute,
    replacement,
    revealMatch,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (searchDebounceRef.current !== null) {
          window.clearTimeout(searchDebounceRef.current);
          searchDebounceRef.current = null;
          applySearch(queryRef.current, true, 0);
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
          return;
        }
        goTo(event.shiftKey ? -1 : 1);
      }
    },
    [applySearch, goTo, handleClose],
  );

  const targetLabel =
    effectiveSearchTarget === "raw" ? "raw markdown" : "editor";

  return (
    <div className="find-bar" role="search">
      <div className="find-bar__row">
        <span className="material-symbols-outlined find-bar__icon">search</span>
        <input
          ref={inputRef}
          type="text"
          className="find-bar__input"
          placeholder={`Find in ${targetLabel}`}
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="find-bar__count" title={`Searching ${targetLabel}`}>
          {matchCount === 0
            ? query
              ? "0/0"
              : ""
            : `${currentIndex + 1}/${matchCount}`}
        </span>
        <button
          type="button"
          className="find-bar__button material-symbols-outlined"
          title="Previous match (Shift+Enter)"
          disabled={matchCount === 0}
          onClick={() => goTo(-1)}
        >
          keyboard_arrow_up
        </button>
        <button
          type="button"
          className="find-bar__button material-symbols-outlined"
          title="Next match (Enter)"
          disabled={matchCount === 0}
          onClick={() => goTo(1)}
        >
          keyboard_arrow_down
        </button>
        <button
          type="button"
          className={`find-bar__button material-symbols-outlined ${replaceMode ? "is-active" : ""}`}
          title={replaceMode ? "Hide replace" : "Show replace (Ctrl+H)"}
          onClick={() => openFindBar(!replaceMode)}
        >
          find_replace
        </button>
        <button
          type="button"
          className="find-bar__button material-symbols-outlined"
          title="Close (Escape)"
          onClick={handleClose}
        >
          close
        </button>
      </div>
      {replaceMode ? (
        <div className="find-bar__row">
          <span className="material-symbols-outlined find-bar__icon opacity-0">search</span>
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
            className="find-bar__action-btn"
            disabled={matchCount === 0}
            onClick={replaceCurrent}
          >
            REPLACE
          </button>
          <button
            type="button"
            className="find-bar__action-btn"
            disabled={matchCount === 0}
            onClick={replaceAll}
          >
            ALL
          </button>
        </div>
      ) : null}
    </div>
  );
}
