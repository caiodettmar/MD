import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ShikiCodeBlockView } from "./ShikiCodeBlock";

export const ShikiCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ShikiCodeBlockView);
  },
});
