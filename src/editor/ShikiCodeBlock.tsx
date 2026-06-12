import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState, useMemo } from "react";
import { getShikiHighlighter, normalizeLanguage } from "./shikiHighlighter";

function readThemeMode(): "dark" | "light" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ShikiCodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = normalizeLanguage(node.attrs.language as string | null);
  const [html, setHtml] = useState("");
  const [themeMode, setThemeMode] = useState(readThemeMode);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState(100);
  const [naturalWidth, setNaturalWidth] = useState<string | null>(null);
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
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
    if (language !== "mermaid") {
      setViewMode("edit");
      setZoom(100);
      setNaturalWidth(null);
    }
  }, [language]);

  useEffect(() => {
    if (language !== "mermaid" || !mermaidSvg) return;

    const timer = setTimeout(() => {
      const container = svgContainerRef.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      if (svg) {
        const styleMaxWidth = svg.style.maxWidth;
        const attrWidth = svg.getAttribute("width");
        const viewBox = svg.getAttribute("viewBox");

        let width = "";
        if (styleMaxWidth && styleMaxWidth !== "none" && styleMaxWidth !== "100%") {
          width = styleMaxWidth;
        } else if (attrWidth && !attrWidth.endsWith("%")) {
          width = attrWidth.endsWith("px") || !isNaN(Number(attrWidth)) ? `${parseFloat(attrWidth)}px` : attrWidth;
        } else if (viewBox) {
          const parts = viewBox.split(" ");
          if (parts.length === 4) {
            width = `${parseFloat(parts[2])}px`;
          }
        }

        if (width) {
          setNaturalWidth(width);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [mermaidSvg, language]);

  const containerStyle = useMemo(() => {
    if (!naturalWidth) {
      return { width: `${zoom}%`, transition: "width 0.15s ease" };
    }
    const val = parseFloat(naturalWidth);
    const unit = naturalWidth.replace(/[0-9.]/g, "") || "px";
    const zoomedVal = val * (zoom / 100);
    return {
      width: `${zoomedVal}${unit}`,
      maxWidth: zoom === 100 ? "100%" : "none",
      transition: "width 0.15s ease",
    };
  }, [naturalWidth, zoom]);

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
    if (language !== "mermaid") {
      return;
    }

    let active = true;

    const renderDiagram = async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          theme: themeMode === "dark" ? "dark" : "default",
          securityLevel: "loose",
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, code);
        
        if (active) {
          setMermaidSvg(svg);
          setMermaidError(null);
          updateAttributes({ mermaidSvg: svg });
        }
      } catch (err: any) {
        if (active) {
          let errMsg = "Invalid Mermaid syntax";
          if (err instanceof Error) {
            errMsg = err.message;
          } else if (typeof err === "string") {
            errMsg = err;
          }
          setMermaidError(errMsg);
          setMermaidSvg("");
        }
      }
    };

    const timer = setTimeout(renderDiagram, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code, language, themeMode, updateAttributes]);

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
          <option value="mermaid">Mermaid</option>
        </select>

        {language === "mermaid" && (
          <div className="md-code-block__view-toggle" contentEditable={false}>
            <button
              type="button"
              className={`md-code-block__toggle-btn${viewMode === "edit" ? " is-active" : ""}`}
              onClick={() => setViewMode("edit")}
            >
              Code
            </button>
            <button
              type="button"
              className={`md-code-block__toggle-btn${viewMode === "preview" ? " is-active" : ""}`}
              onClick={() => setViewMode("preview")}
            >
              Preview
            </button>
          </div>
        )}
      </div>
      <div ref={bodyRef} className="md-code-block__body">
        {language === "mermaid" && viewMode === "preview" && (
          <div className="md-code-block__mermaid-preview" contentEditable={false}>
            <div className="md-code-block__mermaid-toolbar">
              <button
                type="button"
                className="md-code-block__toolbar-btn"
                title="Zoom Out"
                onClick={() => setZoom(z => Math.max(25, z - 25))}
              >
                <span className="material-symbols-outlined">zoom_out</span>
              </button>
              <span className="md-code-block__zoom-label">{zoom}%</span>
              <button
                type="button"
                className="md-code-block__toolbar-btn"
                title="Zoom In"
                onClick={() => setZoom(z => Math.min(300, z + 25))}
              >
                <span className="material-symbols-outlined">zoom_in</span>
              </button>
              <button
                type="button"
                className="md-code-block__toolbar-btn"
                title="Reset Zoom"
                onClick={() => setZoom(100)}
              >
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            </div>
            {mermaidError ? (
              <div className="md-code-block__mermaid-error">{mermaidError}</div>
            ) : (
              <div 
                ref={svgContainerRef}
                className="md-code-block__mermaid-svg-container"
                style={containerStyle}
                dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
              />
            )}
          </div>
        )}

        {showOverlay && (
          <div
            className={`md-code-block__highlight${language === "mermaid" && viewMode === "preview" ? " is-hidden" : ""}`}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <pre 
          className={`md-code-block__editor${language === "mermaid" && viewMode === "preview" ? " is-hidden" : ""}`}
          spellCheck={false}
        >
          <code>
            <NodeViewContent />
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
