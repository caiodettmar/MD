import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { getShikiHighlighter, normalizeLanguage } from "./shikiHighlighter";

function readThemeMode(): "dark" | "light" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ShikiCodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = normalizeLanguage(node.attrs.language as string | null);
  const [html, setHtml] = useState("");
  const [themeMode, setThemeMode] = useState(readThemeMode);
  const bodyRef = useRef<HTMLDivElement>(null);
  const code = node.textContent;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeMode(readThemeMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getShikiHighlighter().then((highlighter) => {
      if (cancelled) {
        return;
      }

      const theme = themeMode === "dark" ? "github-dark" : "github-light";

      try {
        const highlighted = highlighter.codeToHtml(code, {
          lang: language,
          theme,
        });
        setHtml(highlighted);
      } catch {
        setHtml("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, themeMode]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (body.scrollHeight <= body.clientHeight) {
        return;
      }

      body.scrollTop += event.deltaY;
      event.preventDefault();
      event.stopPropagation();
    };

    body.addEventListener("wheel", onWheel, { passive: false });
    return () => body.removeEventListener("wheel", onWheel);
  }, [html, code]);

  const showOverlay = html.length > 0;

  return (
    <NodeViewWrapper
      className={`md-code-block${showOverlay ? " is-highlighted" : ""}`}
    >
      <div className="md-code-block__header">
        <select
          className="md-code-block__language"
          value={language}
          contentEditable={false}
          onChange={(event) =>
            updateAttributes({ language: event.target.value || null })
          }
        >
          <option value="plaintext">Plain text</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="css">CSS</option>
          <option value="html">HTML</option>
          <option value="bash">Bash</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
          <option value="sql">SQL</option>
          <option value="yaml">YAML</option>
        </select>
      </div>
      <div ref={bodyRef} className="md-code-block__body">
        {showOverlay ? (
          <div
            className="md-code-block__highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
        <pre className="md-code-block__editor">
          <code>
            <NodeViewContent />
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
