import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export type LinkClickHandler = (href: string) => void;

let linkClickHandler: LinkClickHandler | null = null;

export function setLinkClickHandler(handler: LinkClickHandler | null) {
  linkClickHandler = handler;
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

              if (target.closest("a")) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
