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

const editor = new Editor({
  extensions: createEditorExtensions(),
  content: "Paragraph before\n\n![alt](http://example.com/img.png)\n\nParagraph after",
  contentType: "markdown",
});

const img = editor.view.dom.querySelector("img");
console.log("Img element found:", !!img);
if (img) {
  console.log("Image node spec draggable:", editor.schema.nodes.image.spec.draggable);
  console.log("Image node spec selectable:", editor.schema.nodes.image.spec.selectable);
  
  const pos = editor.view.posAtDOM(img, 0);
  console.log("posAtDOM(img, 0):", pos);
  const node = editor.state.doc.nodeAt(pos);
  console.log("Node at pos:", node?.type.name);
  console.log("draggable attribute:", img.getAttribute("draggable"));
  console.log("outerHTML:", img.outerHTML);
}

editor.destroy();
process.exit(0);
