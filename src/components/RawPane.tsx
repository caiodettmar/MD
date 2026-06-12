import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { buildRawFindHighlightHtml } from "../lib/rawFindHighlight";
import { scrollTextareaToRange } from "../lib/markdownPaneSync";
import { useEditorStore } from "../stores/editorStore";

export interface RawPaneHandle {
  textarea: HTMLTextAreaElement | null;
  scrollToRange: (start: number, end: number) => void;
}

interface RawPaneProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

export const RawPane = forwardRef<RawPaneHandle, RawPaneProps>(function RawPane(
  { markdown, onChange },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const setFindSearchTarget = useEditorStore((state) => state.setFindSearchTarget);
  const rawFindMatches = useEditorStore((state) => state.rawFindMatches);
  const rawFindCurrentIndex = useEditorStore((state) => state.rawFindCurrentIndex);
  const findBarOpen = useEditorStore((state) => state.findBarOpen);
  const toggleRawPane = useEditorStore((state) => state.toggleRawPane);

  const hasFindHighlights = findBarOpen && rawFindMatches.length > 0;
  const highlightHtml = useMemo(() => {
    if (!hasFindHighlights) {
      return "";
    }

    return buildRawFindHighlightHtml(
      markdown,
      rawFindMatches,
      rawFindCurrentIndex,
    );
  }, [hasFindHighlights, markdown, rawFindCurrentIndex, rawFindMatches]);

  useImperativeHandle(ref, () => ({
    textarea: textareaRef.current,
    scrollToRange: (start: number, end: number) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      scrollTextareaToRange(textarea, start, end);
    },
  }));

  useEffect(() => {
    if (!hasFindHighlights) {
      return;
    }

    const textarea = textareaRef.current;
    const highlightLayer = highlightRef.current;
    if (!textarea || !highlightLayer) {
      return;
    }

    const syncScroll = () => {
      highlightLayer.scrollTop = textarea.scrollTop;
      highlightLayer.scrollLeft = textarea.scrollLeft;
    };

    syncScroll();
    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, [hasFindHighlights, highlightHtml]);

  return (
    <div className="raw-pane">
      <div className="raw-pane__header">
        <span className="raw-pane__label">Raw Markdown</span>
        <button
          type="button"
          className="material-symbols-outlined raw-pane__close"
          onClick={() => toggleRawPane()}
          aria-label="Close raw markdown pane"
        >
          close
        </button>
      </div>
      <div className="raw-pane__editor">
        {hasFindHighlights ? (
          <div
            ref={highlightRef}
            className="raw-pane__highlights"
            aria-hidden="true"
          >
            <pre
              className="raw-pane__highlights-inner"
              dangerouslySetInnerHTML={{ __html: highlightHtml }}
            />
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          className={`raw-pane__textarea${
            hasFindHighlights ? " raw-pane__textarea--overlay" : ""
          }`}
          value={markdown}
          spellCheck={false}
          onFocus={() => setFindSearchTarget("raw")}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (!highlightRef.current) {
              return;
            }

            highlightRef.current.scrollTop = event.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
        />
      </div>
    </div>
  );
});

export function useRawPaneRef(): RefObject<RawPaneHandle | null> {
  return useRef<RawPaneHandle>(null);
}
