import { JSDOM } from "jsdom";
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
dom.window.Document.prototype.elementFromPoint = () => null;
if (dom.window.ShadowRoot) {
  dom.window.ShadowRoot.prototype.elementFromPoint = () => null;
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.getOwnPropertyNames(dom.window).forEach((key) => {
  if (key === "navigator") {
    Object.defineProperty(globalThis, "navigator", {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } else if (!(key in globalThis)) {
    try {
      globalThis[key] = dom.window[key];
    } catch (e) {
      // ignore
    }
  }
});
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

import { Editor } from "@tiptap/core";
import { createEditorExtensions } from "../src/editor/extensions.ts";

try {
  console.log("Initializing editor with heading content...");
  const editor = new Editor({
    extensions: createEditorExtensions(),
    content: "# Heading 1\nSome paragraph text.",
    contentType: "markdown",
  });
  console.log("Success! Rendered HTML:", editor.getHTML());
  editor.destroy();
} catch (error) {
  console.error("CRASH DETECTED:", error);
}
process.exit(0);
