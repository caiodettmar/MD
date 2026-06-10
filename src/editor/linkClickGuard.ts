import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export type LinkClickHandler = (href: string) => void;

let linkClickHandler: LinkClickHandler | null = null;

export function setLinkClickHandler(handler: LinkClickHandler | null) {
  linkClickHandler = handler;
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:|ftp:)/i.test(href.trim());
}

function scrollToEditorAnchor(view: EditorView, href: string) {
  const id = decodeURIComponent(href.slice(1));
  if (!id) {
    return;
  }

  view.dom.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

const linkGuardKey = new PluginKey("mdLinkGuard");

export const LinkClickGuard = Extension.create({
  name: "linkClickGuard",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkGuardKey,
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (event.button !== 0) {
                return false;
              }

              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return false;
              }

              const anchor = target.closest("a");
              if (!anchor || !view.dom.contains(anchor)) {
                return false;
              }

              const href = anchor.getAttribute("href");
              if (!href) {
                return false;
              }

              if (href.startsWith("#")) {
                event.preventDefault();
                event.stopPropagation();
                scrollToEditorAnchor(view, href);
                return true;
              }

              if (!isExternalHref(href)) {
                return false;
              }

              event.preventDefault();
              event.stopPropagation();
              linkClickHandler?.(href);
              return true;
            },
            click: (_view, event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return false;
              }

              const anchor = target.closest("a");
              if (!anchor) {
                return false;
              }

              const href = anchor.getAttribute("href");
              if (!href) {
                return false;
              }

              if (href.startsWith("#")) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              if (!isExternalHref(href)) {
                return false;
              }

              event.preventDefault();
              event.stopPropagation();
              return true;
            },
          },
        },
      }),
    ];
  },
});
