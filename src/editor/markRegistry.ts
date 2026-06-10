import type { Editor } from "@tiptap/react";
import { scoreSlashMatch } from "./slashMenuUtils";

export type MarkCommand = (editor: Editor) => boolean;

export interface MarkRegistryEntry {
  id: string;
  label: string;
  shortcutLabel?: string;
  slashKeywords: string[];
  run: MarkCommand;
}

/**
 * Central registry for formatting commands shared by slash menu,
 * selection toolbar, and inline input rules (Phase 2+).
 */
export const markRegistry: MarkRegistryEntry[] = [
  {
    id: "bold",
    label: "Bold",
    shortcutLabel: "**",
    slashKeywords: ["bold", "b"],
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "Italic",
    shortcutLabel: "*",
    slashKeywords: ["italic", "i"],
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: "strike",
    label: "Strikethrough",
    shortcutLabel: "~~",
    slashKeywords: ["strike", "strikethrough"],
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: "highlight",
    label: "Highlight",
    shortcutLabel: "==",
    slashKeywords: ["highlight", "mark"],
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
  },
  {
    id: "underline",
    label: "Underline",
    slashKeywords: ["underline", "u"],
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    id: "code",
    label: "Inline code",
    shortcutLabel: "`",
    slashKeywords: ["code", "inline"],
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: "subscript",
    label: "Subscript",
    shortcutLabel: "~",
    slashKeywords: ["sub", "subscript"],
    run: (editor) => editor.chain().focus().toggleSubscript().run(),
  },
  {
    id: "superscript",
    label: "Superscript",
    shortcutLabel: "x²",
    slashKeywords: ["sup", "superscript"],
    run: (editor) => editor.chain().focus().toggleSuperscript().run(),
  },
];

export function findRegistryEntry(query: string): MarkRegistryEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return markRegistry;
  }

  return markRegistry
    .map((entry) => ({
      entry,
      score: scoreSlashMatch(normalized, entry.label, entry.slashKeywords),
    }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score)
    .map(({ entry }) => entry);
}
