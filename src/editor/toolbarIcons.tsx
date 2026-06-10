import type { Editor } from "@tiptap/react";

export type ToolbarIconId =
  | "bold"
  | "italic"
  | "strike"
  | "highlight"
  | "underline"
  | "code"
  | "subscript"
  | "superscript"
  | "link"
  | "linkRemove"
  | "textColor"
  | "highlightColor";

interface ToolbarIconProps {
  id: ToolbarIconId;
  className?: string;
}

export function ToolbarIcon({ id, className }: ToolbarIconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "bold":
      return (
        <svg {...common}>
          <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
          <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
        </svg>
      );
    case "italic":
      return (
        <svg {...common}>
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      );
    case "strike":
      return (
        <svg {...common}>
          <path d="M16 4H9a3 3 0 0 0-2.8 4 3 3 0 0 0 1.4 2.2A4 4 0 0 0 8 14.5 4 4 0 0 0 12 18h7" />
          <path d="M4 12h16" />
        </svg>
      );
    case "highlight":
      return (
        <svg {...common}>
          <path d="M9 11l-6 6v3h3l6-6" />
          <path d="M20 4l-4 4" />
          <path d="M14 10l4-4" />
        </svg>
      );
    case "underline":
      return (
        <svg {...common}>
          <path d="M7 5v8a5 5 0 0 0 10 0V5" />
          <path d="M5 19h14" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "subscript":
      return (
        <svg {...common}>
          <path d="M4 5l8 8" />
          <path d="M12 5l-8 8" />
          <path d="M17 19h4" />
        </svg>
      );
    case "superscript":
      return (
        <svg {...common}>
          <path d="M4 19l8-8" />
          <path d="M12 19l-8-8" />
          <path d="M17 7h4" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l2.92-2.92a5 5 0 0 0-7.07-7.07l-1.3 1.3" />
          <path d="M14 11a5 5 0 0 0-7.54-.54L3.54 13.38a5 5 0 0 0 7.07 7.07l1.3-1.3" />
        </svg>
      );
    case "linkRemove":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l2.92-2.92a5 5 0 0 0-7.07-7.07l-1.3 1.3" />
          <path d="M14 11a5 5 0 0 0-7.54-.54L3.54 13.38a5 5 0 0 0 7.07 7.07l1.3-1.3" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
      );
    case "textColor":
      return (
        <svg {...common}>
          <path d="M6 20h12" />
          <path d="M12 4v12" />
          <path d="M8 8h8" />
        </svg>
      );
    case "highlightColor":
      return (
        <svg {...common}>
          <path d="M9 11l-6 6v3h3l6-6" />
          <path d="M20 4l-4 4" />
          <path d="M14 10l4-4" />
          <rect x="3" y="18" width="18" height="3" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

const MARK_ICON_MAP: Record<string, ToolbarIconId> = {
  bold: "bold",
  italic: "italic",
  strike: "strike",
  highlight: "highlight",
  underline: "underline",
  code: "code",
  subscript: "subscript",
  superscript: "superscript",
};

export function getMarkToolbarIcon(id: string): ToolbarIconId {
  return MARK_ICON_MAP[id] ?? "bold";
}

export function getActiveTextColor(editor: Editor): string {
  const attrs = editor.getAttributes("textStyle");
  return typeof attrs.color === "string" && attrs.color ? attrs.color : "#2563eb";
}

export function getActiveHighlightColor(editor: Editor): string {
  const attrs = editor.getAttributes("highlight");
  return typeof attrs.color === "string" && attrs.color
    ? attrs.color
    : "#fde68a";
}
