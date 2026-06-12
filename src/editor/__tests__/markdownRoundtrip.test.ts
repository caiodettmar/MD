import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { createEditorExtensions } from "../extensions";

if (typeof document !== "undefined") {
  document.elementFromPoint = () => null;
}

function createTestEditor() {
  const element = document.createElement("div");
  return new Editor({
    element,
    extensions: createEditorExtensions(),
  });
}

describe("Markdown Roundtrip Integration Tests", () => {
  it("should parse and serialize default and custom colored highlights", () => {
    const editor = createTestEditor();
    
    // Default highlight
    const doc1 = "This is ==highlighted== text.";
    editor.commands.setContent(doc1, { contentType: "markdown" });
    expect(editor.getMarkdown().trim()).toBe(doc1);

    // Colored highlight
    const doc2 = 'This is <mark style="background-color: #ff0000">red highlighted</mark> text.';
    editor.commands.setContent(doc2, { contentType: "markdown" });
    expect(editor.getMarkdown().trim()).toBe(doc2);
    
    editor.destroy();
  });

  it("should parse and serialize footnotes with definitions and handle indentation", () => {
    const editor = createTestEditor();

    const markdown = "This is a footnote reference[^1].\n\n[^1]: This is the footnote body.";
    editor.commands.setContent(markdown, { contentType: "markdown" });
    
    // Check roundtrip
    const output = editor.getMarkdown().trim();
    expect(output).toContain("[^1]");
    expect(output).toContain("[^1]: This is the footnote body.");

    // Check multi-paragraph/indented footnote body
    const multilineMarkdown = "Referencing[^fn2].\n\n[^fn2]: Paragraph one.\n    Paragraph two.";
    editor.commands.setContent(multilineMarkdown, { contentType: "markdown" });
    const multilineOutput = editor.getMarkdown().trim();
    expect(multilineOutput).toContain("[^fn2]");
    expect(multilineOutput).toContain("[^fn2]: Paragraph one.\n    Paragraph two.");

    editor.destroy();
  });

  it("should parse, strip trailing colons, and roundtrip Table of Contents", () => {
    const editor = createTestEditor();

    // Table of contents parsing and heading colon stripping
    const markdownInput = "# Title: Subtitle\n\n[ToC]\n\n## Section 1:\n\n### Section 1.1";
    editor.commands.setContent(markdownInput, { contentType: "markdown" });

    const output = editor.getMarkdown().trim();
    
    // The TOC entry for "Section 1:" should have trailing colon stripped
    expect(output).toContain("- [Section 1](#section-1)");
    expect(output).toContain("- [Section 1.1](#section-1.1)");
    expect(output).toContain("[ToC]");
    expect(output).toContain("[/ToC]");

    editor.destroy();
  });

  it("should parse, serialize, and maintain link reference definitions", () => {
    const editor = createTestEditor();

    const markdownInput = "Check [Google][ref] search.\n\n[ref]: https://google.com \"Google\"";
    editor.commands.setContent(markdownInput, { contentType: "markdown" });

    const output = editor.getMarkdown().trim();
    expect(output).toContain("Check [Google][ref] search.");
    expect(output).toContain('[ref]: https://google.com "Google"');

    editor.destroy();
  });
});
