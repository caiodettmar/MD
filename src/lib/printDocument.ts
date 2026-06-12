const PRINT_STYLES = `
  @page {
    size: auto;
    margin: 0mm; /* Hides default browser print header (date, title) and footer (URL, page) */
  }
  body {
    margin: 0;
    padding: 20mm; /* Provides actual physical page margins */
    color: #15151a;
    background: #ffffff;
    font-family: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #15151a;
    line-height: 1.25;
    margin: 1.4em 0 0.5em;
    font-weight: 600;
  }
  h1 {
    font-size: 22pt;
    border-bottom: 1px solid #d7d7de;
    padding-bottom: 0.3em;
  }
  h2 { font-size: 17pt; }
  h3 { font-size: 14pt; }
  h4 { font-size: 11pt; }
  p { margin: 0 0 1em; }
  a {
    color: #2563eb;
    text-decoration: underline;
  }
  blockquote {
    margin: 1rem 0;
    padding-left: 1rem;
    border-left: 3px solid #d7d7de;
    color: #6b6b76;
  }
  pre, code {
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 9.5pt;
  }
  pre {
    padding: 1rem;
    border-radius: 0.75rem;
    background: #f6f8fa;
    color: #24292e;
    border: 1px solid #d7d7de;
    white-space: pre-wrap;
    word-break: break-all;
  }
  :not(pre) > code {
    padding: 0.15rem 0.35rem;
    border-radius: 0.35rem;
    background: #ececf1;
    color: #15151a;
  }
  /* Force syntax highlighting span colors to inherit in print to ensure readability/contrast */
  .md-code-block span, pre code span {
    color: inherit !important;
    background: transparent !important;
  }
  ul, ol { margin: 1rem 0; padding-left: 1.5rem; }
  li { margin: 0.25rem 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #d7d7de;
    padding: 0.5rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #ececf1;
    color: #15151a;
    font-weight: 600;
  }
  td {
    background: #ffffff;
  }
  hr { border: none; border-top: 1px solid #d7d7de; margin: 1.5rem 0; }
  img { max-width: 100%; height: auto; page-break-inside: avoid; }
  
  /* Definition lists */
  dl { margin: 1rem 0; }
  dt { margin: 0.75rem 0 0.25rem; font-weight: 700; }
  dd { margin: 0 0 0.75rem 1.25rem; }

  /* Table of Contents Print Layout */
  .md-toc {
    border: none;
    background: transparent;
    padding: 0;
    margin: 1rem 0;
    page-break-inside: avoid;
  }
  .md-toc__header {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .md-toc__toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 0;
    background: transparent;
    font-weight: 600;
    cursor: default;
    pointer-events: none;
    color: inherit;
  }
  .md-toc__chevron {
    display: none !important;
  }
  .md-toc__update {
    display: none !important;
  }
  .md-toc__list {
    counter-reset: toc-item;
    list-style: none !important;
    margin: 0;
    padding-left: 1.25rem;
  }
  .md-toc > .md-toc__list {
    padding-left: 0;
  }
  .md-toc__item {
    counter-increment: toc-item;
    margin: 0.25rem 0;
    list-style: none !important;
  }
  .md-toc__link::before {
    content: counters(toc-item, ".") " ";
    font-weight: 500;
    margin-right: 0.25rem;
  }
  .md-toc > .md-toc__list > .md-toc__item > .md-toc__link::before {
    content: counters(toc-item, ".") ". ";
  }
  .md-toc__link {
    color: #2563eb;
    text-decoration: none;
  }

  /* Nested ordered lists */
  ol:not(.md-toc__list) {
    counter-reset: ol-item;
    list-style: none !important;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  ol:not(.md-toc__list) > li:not(.md-toc__item) {
    counter-increment: ol-item;
    list-style: none !important;
  }
  ol:not(.md-toc__list) > li:not(.md-toc__item)::before {
    content: counters(ol-item, ".") ". ";
    color: #6b7280;
    margin-right: 0.35rem;
    display: inline-block;
  }
  ol:not(.md-toc__list) li ol:not(.md-toc__list) > li:not(.md-toc__item)::before {
    content: counters(ol-item, ".") " ";
  }
  ol:not(.md-toc__list) > li:not(.md-toc__item) > p:first-child {
    display: inline;
  }

  /* Footnotes */
  .md-footnote-ref {
    color: #2563eb;
    font-weight: 600;
    font-size: 0.75em;
    vertical-align: super;
    line-height: 0;
  }
  .md-footnote-definition {
    margin: 1rem 0;
    padding: 0.75rem 0.9rem;
    border: 1px solid #d7d7de;
    border-left: 3px solid #2563eb;
    border-radius: 0.65rem;
    background: #ececf1;
    page-break-inside: avoid;
  }
  .md-footnote-definition::before {
    content: "[^" attr(data-footnote-id) "]: ";
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b6b76;
    font-family: "Cascadia Code", Consolas, monospace;
  }
  
  /* Task Items */
  .md-task-item {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.55rem;
    margin: 0.35rem 0;
  }
  .md-task-item input {
    margin-top: 0.2rem;
  }

  /* Back-to-ToC Link is hidden in print */
  .md-back-to-toc,
  .md-footnote-backlink {
    display: none !important;
  }

  .md-link-ref-definition,
  [data-type="linkReferenceDefinition"] {
    display: none !important;
  }
  
  .md-code-block--mermaid-render {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1.5rem 0;
    page-break-inside: avoid;
    border: 0;
    background: transparent;
    padding: 0;
  }
  .md-code-block--mermaid-render svg {
    max-width: 100%;
    height: auto;
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Print editor HTML in a hidden iframe. Avoids window.open (blocked / null in
 * Tauri WebView) and produces styled output independent of app chrome CSS.
 */
export function printHtmlDocument(html: string, title: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!frameWindow || !doc) {
    iframe.remove();
    window.print();
    return;
  }

  // Replace data-mermaid-svg wrappers with raw SVG HTML for printing
  const processedHtml = html.replace(
    /<div[^>]*class="[^"]*md-code-block--mermaid-render[^"]*"[^>]*data-mermaid-svg="([^"]*)"[^>]*><\/div>/g,
    (_, svgEscaped) => {
      return svgEscaped
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
  );

  const safeTitle = escapeHtml(title);
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>${PRINT_STYLES}</style></head><body>${processedHtml}</body></html>`,
  );
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);

  frameWindow.focus();
  frameWindow.print();
}

/**
 * Fallback: print the live app window (browser dev / when no editor HTML).
 */
export function printCurrentWindow(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
  window.print();
}
