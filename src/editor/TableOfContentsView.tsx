import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  scanDocumentHeadings,
  buildTocTree,
  type TocEntry,
  type TocTreeNode,
} from "./tableOfContentsExtension";

function RenderTocTree({ nodes, editor }: { nodes: TocTreeNode[]; editor: any }) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ol className="md-toc__list">
      {nodes.map((node) => {
        const entry = node.entry!;
        return (
          <li
            key={`${entry.anchor}-${entry.level}-${entry.text}`}
            className="md-toc__item"
          >
            <a
              href={`#${entry.anchor}`}
              className="md-toc__link"
              onClick={(event) => {
                event.preventDefault();
                const target = editor.view.dom.querySelector(
                  `#${CSS.escape(entry.anchor)}`,
                );
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {entry.text}
            </a>
            <RenderTocTree nodes={node.children} editor={editor} />
          </li>
        );
      })}
    </ol>
  );
}

export function TableOfContentsView({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const entries = (node.attrs.entries as TocEntry[] | undefined) ?? [];
  const collapsed = Boolean(node.attrs.collapsed);

  const refreshEntries = () => {
    updateAttributes({ entries: scanDocumentHeadings(editor.state.doc) });
  };

  return (
    <NodeViewWrapper className="md-toc-wrapper">
      <div
        className={`md-toc${collapsed ? " is-collapsed" : ""}${
          selected ? " is-selected" : ""
        }`}
        contentEditable={false}
      >
        <div className="md-toc__header">
          <button
            type="button"
            className="md-toc__toggle"
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? "Expand table of contents"
                : "Collapse table of contents"
            }
            onClick={() => updateAttributes({ collapsed: !collapsed })}
          >
            <span
              className={`md-toc__chevron${collapsed ? " is-collapsed" : ""}`}
              aria-hidden="true"
            />
            <span>Table of contents</span>
          </button>
          {selected ? (
            <button
              type="button"
              className="md-toc__update"
              onClick={refreshEntries}
            >
              Update ToC
            </button>
          ) : null}
        </div>
        {!collapsed ? (
          entries.length > 0 ? (
            <RenderTocTree nodes={buildTocTree(entries).children} editor={editor} />
          ) : (
            <p className="md-toc__empty">No headings yet — add H1–H6, then Update ToC.</p>
          )
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
