const PRINT_STYLES = `
  @page { margin: 2cm; }
  body {
    margin: 0;
    padding: 0;
    color: #000;
    background: #fff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.6;
  }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.2em 0 0.4em; }
  p { margin: 0.6em 0; }
  a { color: #000; text-decoration: underline; }
  blockquote {
    margin: 0.8em 0;
    padding-left: 1em;
    border-left: 3px solid #999;
    color: #444;
  }
  pre, code {
    font-family: Consolas, "Cascadia Code", monospace;
    font-size: 10pt;
  }
  pre {
    padding: 0.75em 1em;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :not(pre) > code {
    padding: 0.1em 0.35em;
    background: #f0f0f0;
    border-radius: 3px;
  }
  ul, ol { margin: 0.6em 0; padding-left: 1.5em; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
  th, td { border: 1px solid #ccc; padding: 0.35em 0.6em; text-align: left; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  .md-link-ref-definition,
  [data-type="linkReferenceDefinition"] { display: none !important; }
  mark { background: #fde68a; color: inherit; }
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

  const safeTitle = escapeHtml(title);
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>${PRINT_STYLES}</style></head><body>${html}</body></html>`,
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
