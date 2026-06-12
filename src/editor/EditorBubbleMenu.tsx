import { isTextSelection, posToDOMRect } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LinkEditDialog } from "../components/LinkEditDialog";
import {
  HIGHLIGHT_COLOR_PRESETS,
  TEXT_COLOR_PRESETS,
} from "./constants/colors";
import { markRegistry } from "./markRegistry";
import {
  getActiveHighlightColor,
  getActiveTextColor,
  getMarkToolbarIcon,
  ToolbarIcon,
} from "./toolbarIcons";

interface EditorBubbleMenuProps {
  editor: Editor;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

type ToolbarView = "main" | "headings" | "textColor" | "highlightColor";

const TOOLBAR_VIEWPORT_PADDING = 8;

function isMarkActive(editor: Editor, id: string): boolean {
  switch (id) {
    case "bold":
      return editor.isActive("bold");
    case "italic":
      return editor.isActive("italic");
    case "strike":
      return editor.isActive("strike");
    case "highlight":
      return editor.isActive("highlight");
    case "underline":
      return editor.isActive("underline");
    case "code":
      return editor.isActive("code");
    case "subscript":
      return editor.isActive("subscript");
    case "superscript":
      return editor.isActive("superscript");
    default:
      return false;
  }
}

function shouldShowSelectionToolbar(editor: Editor): boolean {
  if (!editor.isEditable || editor.isDestroyed || !editor.view.hasFocus()) {
    return false;
  }

  const { selection, doc } = editor.state;
  if (!isTextSelection(selection) || selection.empty) {
    return false;
  }

  const { from, to } = selection;
  return doc.textBetween(from, to).length > 0;
}

function getToolbarAnchor(editor: Editor): ToolbarPosition | null {
  if (!shouldShowSelectionToolbar(editor)) {
    return null;
  }

  const { from, to } = editor.state.selection;
  const rect = posToDOMRect(editor.view, from, to);

  return {
    top: rect.top - TOOLBAR_VIEWPORT_PADDING,
    left: rect.left + rect.width / 2,
  };
}

function clampToolbarPosition(
  anchor: ToolbarPosition,
  toolbarWidth: number,
  toolbarHeight: number,
): ToolbarPosition {
  const halfWidth = toolbarWidth / 2;
  const minLeft = TOOLBAR_VIEWPORT_PADDING + halfWidth;
  const maxLeft = window.innerWidth - TOOLBAR_VIEWPORT_PADDING - halfWidth;
  const minTop = TOOLBAR_VIEWPORT_PADDING + toolbarHeight;

  return {
    top: Math.max(minTop, anchor.top),
    left: Math.min(Math.max(minLeft, anchor.left), maxLeft),
  };
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<ToolbarView>("main");
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [hasExistingLink, setHasExistingLink] = useState(false);
  const [customTextColor, setCustomTextColor] = useState("#2563eb");
  const [customHighlightColor, setCustomHighlightColor] = useState("#fde68a");

  const resetView = useCallback(() => {
    setView("main");
  }, []);

  const openLinkDialog = useCallback(() => {
    const attrs = editor.getAttributes("link");
    const existing = editor.isActive("link");
    setLinkHref(typeof attrs.href === "string" ? attrs.href : "");
    setLinkTitle(typeof attrs.title === "string" ? attrs.title : "");
    setHasExistingLink(existing);
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback(
    (href: string, title: string) => {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href, title: title || null })
        .run();
      setLinkDialogOpen(false);
    },
    [editor],
  );

  const removeLink = useCallback(() => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
  }, [editor]);

  const removeFormatting = useCallback(() => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }, [editor]);

  const syncToolbar = useCallback(() => {
    const anchor = getToolbarAnchor(editor);
    if (!anchor) {
      setVisible(false);
      resetView();
      return;
    }

    setCustomTextColor(getActiveTextColor(editor));
    setCustomHighlightColor(getActiveHighlightColor(editor));
    setVisible(true);
    window.requestAnimationFrame(() => {
      const toolbar = toolbarRef.current;
      if (!toolbar) {
        setPosition(anchor);
        return;
      }

      setPosition(
        clampToolbarPosition(
          anchor,
          toolbar.offsetWidth,
          toolbar.offsetHeight,
        ),
      );
    });
  }, [editor, resetView]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      window.requestAnimationFrame(syncToolbar);
    };

    const handleBlur = () => {
      setVisible(false);
      resetView();
    };

    syncToolbar();
    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
    };
  }, [editor, resetView, syncToolbar]);

  const linkDialog = (
    <LinkEditDialog
      open={linkDialogOpen}
      initialHref={linkHref}
      initialTitle={linkTitle}
      hasExistingLink={hasExistingLink}
      onApply={applyLink}
      onRemove={removeLink}
      onClose={() => setLinkDialogOpen(false)}
    />
  );

  if (!visible) {
    return linkDialogOpen ? createPortal(linkDialog, document.body) : null;
  }

  const activeTextColor = getActiveTextColor(editor);

  const backButton = (
    <button
      type="button"
      className="selection-toolbar__button"
      title="Back"
      aria-label="Back to formatting toolbar"
      onMouseDown={(event) => {
        event.preventDefault();
        resetView();
      }}
    >
      <ToolbarIcon id="back" />
    </button>
  );

  const renderMainToolbar = () => (
    <>
      {/* Group 1: Text */}
      <div className="selection-toolbar__group">
        {markRegistry.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`selection-toolbar__button ${
              isMarkActive(editor, entry.id) ? "is-active" : ""
            }`}
            title={entry.label}
            aria-label={entry.label}
            onMouseDown={(event) => {
              event.preventDefault();
              entry.run(editor);
            }}
          >
            <ToolbarIcon id={getMarkToolbarIcon(entry.id)} />
          </button>
        ))}
      </div>

      <span className="selection-toolbar__divider" aria-hidden="true" />

      {/* Group 2: Color */}
      <div className="selection-toolbar__group">
        <button
          type="button"
          className="selection-toolbar__button selection-toolbar__button--color"
          title="Text color"
          aria-label="Text color"
          onMouseDown={(event) => {
            event.preventDefault();
            setView("textColor");
          }}
        >
          <span
            className="selection-toolbar__text-color-glyph"
            style={{ borderBottomColor: activeTextColor }}
          >
            A
          </span>
        </button>
        <button
          type="button"
          className="selection-toolbar__button"
          title="Highlight color"
          aria-label="Highlight color"
          onMouseDown={(event) => {
            event.preventDefault();
            setView("highlightColor");
          }}
        >
          <ToolbarIcon id="highlightColor" />
        </button>
        <button
          type="button"
          className="selection-toolbar__button"
          title="Remove formatting"
          aria-label="Remove formatting"
          onMouseDown={(event) => {
            event.preventDefault();
            removeFormatting();
          }}
        >
          <ToolbarIcon id="clearFormatting" />
        </button>
      </div>

      <span className="selection-toolbar__divider" aria-hidden="true" />

      {/* Group 3: Structure */}
      <div className="selection-toolbar__group">
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("heading") ? "is-active" : ""
          }`}
          title="Heading"
          aria-label="Heading"
          onMouseDown={(event) => {
            event.preventDefault();
            setView("headings");
          }}
        >
          <ToolbarIcon id="heading" />
        </button>
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("bulletList") ? "is-active" : ""
          }`}
          title="Bullet list"
          aria-label="Bullet list"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <ToolbarIcon id="bulletList" />
        </button>
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("orderedList") ? "is-active" : ""
          }`}
          title="Numbered list"
          aria-label="Numbered list"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ToolbarIcon id="orderedList" />
        </button>
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("taskList") ? "is-active" : ""
          }`}
          title="Task list"
          aria-label="Task list"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleTaskList().run();
          }}
        >
          <ToolbarIcon id="taskList" />
        </button>
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("blockquote") ? "is-active" : ""
          }`}
          title="Quote"
          aria-label="Quote"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleBlockquote().run();
          }}
        >
          <ToolbarIcon id="blockquote" />
        </button>
      </div>

      <span className="selection-toolbar__divider" aria-hidden="true" />

      {/* Group 4: Link */}
      <div className="selection-toolbar__group">
        <button
          type="button"
          className={`selection-toolbar__button ${
            editor.isActive("link") ? "is-active" : ""
          }`}
          title={editor.isActive("link") ? "Edit link" : "Add link"}
          aria-label={editor.isActive("link") ? "Edit link" : "Add link"}
          onMouseDown={(event) => {
            event.preventDefault();
            openLinkDialog();
          }}
        >
          <ToolbarIcon id="link" />
        </button>
        {editor.isActive("link") ? (
          <button
            type="button"
            className="selection-toolbar__button"
            title="Remove link"
            aria-label="Remove link"
            onMouseDown={(event) => {
              event.preventDefault();
              removeLink();
            }}
          >
            <ToolbarIcon id="linkRemove" />
          </button>
        ) : null}
      </div>
    </>
  );

  const renderHeadingsToolbar = () => (
    <>
      {backButton}
      {([1, 2, 3, 4, 5, 6] as const).map((level) => (
        <button
          key={level}
          type="button"
          className={`selection-toolbar__button selection-toolbar__button--label ${
            editor.isActive("heading", { level }) ? "is-active" : ""
          }`}
          title={`Heading ${level}`}
          aria-label={`Heading ${level}`}
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleHeading({ level }).run();
            resetView();
          }}
        >
          H{level}
        </button>
      ))}
    </>
  );

  const renderTextColorToolbar = () => (
    <>
      {backButton}
      {TEXT_COLOR_PRESETS.filter((preset) => preset.value).map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="selection-toolbar__color"
          title={preset.label}
          aria-label={preset.label}
          style={{ backgroundColor: preset.value }}
          onMouseDown={(event) => {
            event.preventDefault();
            setCustomTextColor(preset.value);
            editor.chain().focus().setColor(preset.value).run();
            resetView();
          }}
        />
      ))}
      <label className="selection-toolbar__custom-color">
        <input
          type="color"
          value={customTextColor}
          aria-label="Text color custom color"
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => {
            setCustomTextColor(event.target.value);
            editor.chain().focus().setColor(event.target.value).run();
          }}
        />
      </label>
      <button
        type="button"
        className="selection-toolbar__button selection-toolbar__button--label"
        title="Reset text color"
        aria-label="Reset text color"
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().unsetColor().run();
          resetView();
        }}
      >
        Reset
      </button>
    </>
  );

  const renderHighlightColorToolbar = () => (
    <>
      {backButton}
      {HIGHLIGHT_COLOR_PRESETS.filter((preset) => preset.value).map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="selection-toolbar__color"
          title={preset.label}
          aria-label={preset.label}
          style={{ backgroundColor: preset.value }}
          onMouseDown={(event) => {
            event.preventDefault();
            setCustomHighlightColor(preset.value);
            editor.chain().focus().setHighlight({ color: preset.value }).run();
            resetView();
          }}
        />
      ))}
      <label className="selection-toolbar__custom-color">
        <input
          type="color"
          value={customHighlightColor}
          aria-label="Highlight color custom color"
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => {
            setCustomHighlightColor(event.target.value);
            editor.chain().focus().setHighlight({ color: event.target.value }).run();
          }}
        />
      </label>
      <button
        type="button"
        className="selection-toolbar__button selection-toolbar__button--label"
        title="Clear highlight"
        aria-label="Clear highlight"
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().unsetHighlight().run();
          resetView();
        }}
      >
        Clear
      </button>
    </>
  );

  const renderToolbarContent = () => {
    switch (view) {
      case "headings":
        return renderHeadingsToolbar();
      case "textColor":
        return renderTextColorToolbar();
      case "highlightColor":
        return renderHighlightColorToolbar();
      default:
        return renderMainToolbar();
    }
  };

  return createPortal(
    <div
      ref={toolbarRef}
      className="selection-toolbar"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 40,
      }}
    >
      {renderToolbarContent()}
      {linkDialog}
    </div>,
    document.body,
  );
}
