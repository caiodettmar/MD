import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import { MarkdownTable } from "./markdownTable";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { FootnoteDefinitionExtension } from "./footnoteDefinitionExtension";
import { FootnoteExtension } from "./footnoteExtension";
import { InlineBlockTriggers } from "./inlineBlockTriggers";
import { LinkClickGuard } from "./linkClickGuard";
import { LinkReferenceDefMarkdownParser } from "./linkReferenceDefMarkdownParser";
import { LinkReferenceDefinitionExtension } from "./linkReferenceDefinitionExtension";
import { LinkReferenceDefinitionMaintain } from "./linkReferenceDefinitionMaintain";
import { LinkReferenceMarkdownParser } from "./linkReferenceMarkdownParser";
import { MarkdownLink } from "./markdownLink";
import { MarkdownPaste } from "./markdownPaste";
import { MarkdownDelimiterMarks } from "./markdownDelimiterMarks";
import { createMarkdownImage } from "./markdownImage";
import { MarkdownHighlight } from "./markdownHighlight";
import { MarkdownSubscript } from "./markdownSubscript";
import { MarkdownSuperscript } from "./markdownSuperscript";
import { MarkdownTextStyle } from "./markdownTextStyle";
import {
  DefinitionDescription,
  DefinitionList,
  DefinitionTerm,
} from "./definitionListExtension";
import { HeadingWithAnchor } from "./headingAnchorExtension";
import { ShikiCodeBlock } from "./shikiCodeBlockExtension";
import { TableOfContents } from "./tableOfContentsExtension";

const NoInputBold = Bold.extend({ addInputRules: () => [] });
const NoInputItalic = Italic.extend({ addInputRules: () => [] });
const NoInputCode = Code.extend({ addInputRules: () => [] });
const NoInputStrike = Strike.extend({ addInputRules: () => [] });

export function createEditorExtensions(
  getDocumentPath: () => string | null = () => null,
) {
  return [
    StarterKit.configure({
      bold: false,
      italic: false,
      code: false,
      strike: false,
      codeBlock: false,
      underline: false,
      heading: false,
      link: false,
    }),
    HeadingWithAnchor.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    NoInputBold,
    NoInputItalic,
    NoInputCode,
    NoInputStrike,
    Markdown,
    LinkReferenceDefinitionExtension,
    LinkReferenceDefMarkdownParser,
    LinkReferenceMarkdownParser,
    FootnoteDefinitionExtension,
    FootnoteExtension,
    MarkdownDelimiterMarks,
    InlineBlockTriggers,
    MarkdownPaste,
    ShikiCodeBlock,
    Placeholder.configure({
      placeholder: "Start writing, or press / for commands…",
    }),
    MarkdownLink.configure({
      openOnClick: false,
      enableClickSelection: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        class: "md-link",
      },
    }),
    LinkClickGuard,
    Underline,
    MarkdownHighlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: "md-highlight",
      },
    }),
    MarkdownSubscript,
    MarkdownSuperscript,
    MarkdownTextStyle,
    Color,
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "md-task-item",
      },
    }),
    DefinitionList,
    DefinitionTerm,
    DefinitionDescription,
    TableOfContents,
    MarkdownTable.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    createMarkdownImage(getDocumentPath).configure({
      inline: false,
      allowBase64: true,
    }),
    LinkReferenceDefinitionMaintain,
  ];
}
