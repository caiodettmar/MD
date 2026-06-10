import type {
  JSONContent,
  MarkdownParseHelpers,
  MarkdownRendererHelpers,
  MarkdownToken,
} from "@tiptap/core";
import { Table } from "@tiptap/extension-table";

const TABLE_CELL_LINE_BREAK = "<br>";

enum TableCellAlign {
  Left = "left",
  Right = "right",
  Center = "center",
}

function normalizeTableCellAlign(value: unknown): TableCellAlign | null {
  if (
    value === TableCellAlign.Left ||
    value === TableCellAlign.Right ||
    value === TableCellAlign.Center
  ) {
    return value;
  }
  return null;
}

function normalizeTableCellAlignFromAttributes(
  attributes: { align?: TableCellAlign } | null | undefined,
): TableCellAlign | null {
  return normalizeTableCellAlign(attributes?.align);
}

type MarkdownTableToken = {
  align?: Array<TableCellAlign | null>;
  header?: { tokens: MarkdownToken[]; align?: TableCellAlign | null }[];
  rows?: { tokens: MarkdownToken[]; align?: TableCellAlign | null }[][];
} & MarkdownToken;

function tokensToRawText(tokens: MarkdownToken[]): string {
  return tokens
    .map((token) => {
      if ("text" in token && typeof token.text === "string") {
        return token.text;
      }
      if ("raw" in token && typeof token.raw === "string") {
        return token.raw;
      }
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return tokensToRawText(token.tokens as MarkdownToken[]);
      }
      return "";
    })
    .join("");
}

function normalizeTableCellText(raw: string): string {
  return raw
    .replace(/\u001f/g, TABLE_CELL_LINE_BREAK)
    .replace(/ {2}\n/g, TABLE_CELL_LINE_BREAK)
    .replace(/\n/g, TABLE_CELL_LINE_BREAK)
    .split(/<br\s*\/?>/i)
    .map((part) => part.replace(/[ \t]+/g, " ").trim())
    .join(TABLE_CELL_LINE_BREAK);
}

function renderCellContent(
  cellNode: JSONContent,
  helpers: MarkdownRendererHelpers,
): string {
  if (cellNode.content && cellNode.content.length > 1) {
    return cellNode.content
      .map((child) =>
        normalizeTableCellText(helpers.renderChildren(child as JSONContent)),
      )
      .join(TABLE_CELL_LINE_BREAK);
  }

  return normalizeTableCellText(
    cellNode.content
      ? helpers.renderChildren(cellNode.content as JSONContent[])
      : "",
  );
}

function renderTableToMarkdownWithLineBreaks(
  node: JSONContent,
  helpers: MarkdownRendererHelpers,
): string {
  if (!node?.content?.length) {
    return "";
  }

  const rows: {
    text: string;
    isHeader: boolean;
    align: ReturnType<typeof normalizeTableCellAlignFromAttributes>;
  }[][] = [];

  node.content.forEach((rowNode) => {
    const cells: {
      text: string;
      isHeader: boolean;
      align: ReturnType<typeof normalizeTableCellAlignFromAttributes>;
    }[] = [];

    rowNode.content?.forEach((cellNode) => {
      cells.push({
        text: renderCellContent(cellNode, helpers),
        isHeader: cellNode.type === "tableHeader",
        align: normalizeTableCellAlignFromAttributes(cellNode.attrs),
      });
    });

    rows.push(cells);
  });

  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (columnCount === 0) {
    return "";
  }

  const colWidths = Array.from<number>({ length: columnCount }).fill(0);
  rows.forEach((row) => {
    for (let index = 0; index < columnCount; index += 1) {
      const cell = row[index]?.text ?? "";
      colWidths[index] = Math.max(colWidths[index], cell.length, 3);
    }
  });

  const pad = (value: string, width: number) =>
    value + " ".repeat(Math.max(0, width - value.length));

  const headerRow = rows[0];
  const hasHeader = headerRow.some((cell) => cell.isHeader);
  const colAlignments: Array<TableCellAlign | null> = Array.from({
    length: columnCount,
  }).fill(null) as Array<TableCellAlign | null>;

  rows.forEach((row) => {
    for (let index = 0; index < columnCount; index += 1) {
      if (!colAlignments[index] && row[index]?.align) {
        colAlignments[index] = row[index].align;
      }
    }
  });

  let output = "\n";
  const headerTexts = Array.from({ length: columnCount }).map((_, index) =>
    hasHeader ? (headerRow[index]?.text ?? "") : "",
  );

  output += `| ${headerTexts.map((text, index) => pad(text, colWidths[index])).join(" | ")} |\n`;
  output += `| ${colWidths
    .map((width, index) => {
      const dashCount = Math.max(3, width);
      const alignment = colAlignments[index];

      if (alignment === TableCellAlign.Left) {
        return `:${"-".repeat(dashCount)}`;
      }
      if (alignment === TableCellAlign.Right) {
        return `${"-".repeat(dashCount)}:`;
      }
      if (alignment === TableCellAlign.Center) {
        return `:${"-".repeat(dashCount)}:`;
      }
      return "-".repeat(dashCount);
    })
    .join(" | ")} |\n`;

  const body = hasHeader ? rows.slice(1) : rows;
  body.forEach((row) => {
    output += `| ${Array.from({ length: columnCount })
      .map((_, index) => pad(row[index]?.text ?? "", colWidths[index]))
      .join(" | ")} |\n`;
  });

  return output;
}

function parseInlineText(helpers: MarkdownParseHelpers, text: string): JSONContent[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const tokens = helpers.tokenizeInline?.(trimmed) ?? [
    { type: "text", text: trimmed } as MarkdownToken,
  ];
  return helpers.parseInline(tokens);
}

function createTableCellBlocks(
  cell: { tokens: MarkdownToken[] },
  helpers: MarkdownParseHelpers,
): JSONContent[] {
  const raw = tokensToRawText(cell.tokens);
  if (/<br\s*\/?>/i.test(raw)) {
    const parts = raw.split(/<br\s*\/?>/i);
    return parts.map((part) => ({
      type: "paragraph",
      content: part.trim() ? parseInlineText(helpers, part) : undefined,
    }));
  }

  return [{ type: "paragraph", content: helpers.parseInline(cell.tokens) }];
}

/**
 * Table markdown serialization uses visible `<br>` for in-cell line breaks instead
 * of TipTap's default U+001F unit separator.
 */
export const MarkdownTable = Table.extend({
  renderMarkdown(node, helpers) {
    return renderTableToMarkdownWithLineBreaks(node, helpers);
  },

  parseMarkdown(token: MarkdownTableToken, helpers) {
    const rows: JSONContent[] = [];
    const alignments = Array.isArray(token.align) ? token.align : [];

    if (token.header) {
      const headerCells = token.header.map((cell, index) => {
        const align = normalizeTableCellAlign(alignments[index] ?? cell.align);
        const attrs = align ? { align } : {};
        return helpers.createNode(
          "tableHeader",
          attrs,
          createTableCellBlocks(cell, helpers),
        );
      });
      rows.push(helpers.createNode("tableRow", {}, headerCells));
    }

    token.rows?.forEach((row) => {
      const bodyCells = row.map((cell, index) => {
        const align = normalizeTableCellAlign(alignments[index] ?? cell.align);
        const attrs = align ? { align } : {};
        return helpers.createNode(
          "tableCell",
          attrs,
          createTableCellBlocks(cell, helpers),
        );
      });
      rows.push(helpers.createNode("tableRow", {}, bodyCells));
    });

    return helpers.createNode("table", undefined, rows);
  },
});
