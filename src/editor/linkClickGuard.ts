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

if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => {
    const tooltip = document.getElementById("md-footnote-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }, { passive: true });
}

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

              // Handle footnote click
              const footnoteRef = target.closest("sup.md-footnote-ref");
              if (footnoteRef) {
                event.preventDefault();
                event.stopPropagation();
                const id = footnoteRef.getAttribute("data-footnote-id");
                if (id) {
                  const defElement = view.dom.querySelector(
                    `.md-footnote-definition[data-footnote-id="${CSS.escape(id)}"]`
                  );
                  if (defElement instanceof HTMLElement) {
                    defElement.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }
                return true;
              }

              // Handle footnote definition backlink click
              const backlink = target.closest(".md-footnote-backlink");
              if (backlink) {
                event.preventDefault();
                event.stopPropagation();
                const id = backlink.getAttribute("data-footnote-backlink-id");
                if (id) {
                  const refElement = view.dom.querySelector(
                    `sup.md-footnote-ref[data-footnote-id="${CSS.escape(id)}"]`
                  );
                  if (refElement instanceof HTMLElement) {
                    refElement.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }
                return true;
              }

              const anchor = target.closest("a");
              if (!anchor || !view.dom.contains(anchor)) {
                return false;
              }

              const isBackToToc =
                anchor.classList.contains("md-back-to-toc") ||
                anchor.getAttribute("data-toc-back") === "true";
              if (isBackToToc) {
                event.preventDefault();
                event.stopPropagation();
                const tocElement = view.dom.querySelector(".md-toc");
                if (tocElement) {
                  tocElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                } else {
                  view.dom.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
                return true;
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

              const footnoteRef = target.closest("sup.md-footnote-ref");
              if (footnoteRef) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              const backlink = target.closest(".md-footnote-backlink");
              if (backlink) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              const anchor = target.closest("a");
              if (!anchor) {
                return false;
              }

              const isBackToToc =
                anchor.classList.contains("md-back-to-toc") ||
                anchor.getAttribute("data-toc-back") === "true";
              if (isBackToToc) {
                event.preventDefault();
                event.stopPropagation();
                return true;
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
            mouseover: (view, event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return false;
              }

              const footnoteRef = target.closest("sup.md-footnote-ref");
              if (!footnoteRef) {
                return false;
              }

              const id = footnoteRef.getAttribute("data-footnote-id");
              if (!id) {
                return false;
              }

              const defContent = view.dom.querySelector(
                `.md-footnote-definition[data-footnote-id="${CSS.escape(id)}"] .md-footnote-definition__content`
              );
              if (!defContent) {
                return false;
              }

              const text = defContent.textContent?.trim() || "";
              if (!text) {
                return false;
              }

              let tooltip = document.getElementById("md-footnote-tooltip");
              if (!tooltip) {
                tooltip = document.createElement("div");
                tooltip.id = "md-footnote-tooltip";
                tooltip.className = "md-footnote-tooltip";
                document.body.appendChild(tooltip);
              }

              tooltip.textContent = text;
              tooltip.classList.add("visible");

              const rect = footnoteRef.getBoundingClientRect();
              tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
              tooltip.style.top = `${rect.top + window.scrollY - 8}px`;

              return true;
            },
            mouseout: (_view, event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return false;
              }

              const footnoteRef = target.closest("sup.md-footnote-ref");
              if (!footnoteRef) {
                return false;
              }

              const related = event.relatedTarget;
              if (related instanceof HTMLElement && related.closest("sup.md-footnote-ref")) {
                return false;
              }

              const tooltip = document.getElementById("md-footnote-tooltip");
              if (tooltip) {
                tooltip.classList.remove("visible");
              }

              return true;
            },
          },
        },
      }),
    ];
  },
});
