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

function ColorPopover({
  title,
  presets,
  customColor,
  onPick,
  onClear,
  clearLabel,
}: {
  title: string;
  presets: typeof TEXT_COLOR_PRESETS;
  customColor: string;
  onPick: (color: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="selection-toolbar__popover" role="group" aria-label={title}>
      <div className="selection-toolbar__popover-title">{title}</div>
      <div className="selection-toolbar__swatches">
        {presets.filter((preset) => preset.value).map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="selection-toolbar__color"
            title={preset.label}
            style={{ backgroundColor: preset.value }}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(preset.value);
            }}
          />
        ))}
      </div>
      <label className="selection-toolbar__custom-color">
        <span>Custom</span>
        <input
          type="color"
          value={customColor}
          aria-label={`${title} custom color`}
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => onPick(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="selection-toolbar__button selection-toolbar__button--compact"
        title={clearLabel}
        onMouseDown={(event) => {
          event.preventDefault();
          onClear();
        }}
      >
        {clearLabel}
      </button>
    </div>
  );
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [textColorsOpen, setTextColorsOpen] = useState(false);
  const [highlightColorsOpen, setHighlightColorsOpen] = useState(false);
  const [headingsOpen, setHeadingsOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [hasExistingLink, setHasExistingLink] = useState(false);
  const [customTextColor, setCustomTextColor] = useState("#2563eb");
  const [customHighlightColor, setCustomHighlightColor] = useState("#fde68a");

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
      setTextColorsOpen(false);
      setHighlightColorsOpen(false);
      setHeadingsOpen(false);
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
  }, [editor]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      window.requestAnimationFrame(syncToolbar);
    };

    const handleBlur = () => {
      setVisible(false);
      setTextColorsOpen(false);
      setHighlightColorsOpen(false);
      setHeadingsOpen(false);
    };

    syncToolbar();
    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
    };
  }, [editor, syncToolbar]);

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
      <span className="selection-toolbar__divider" aria-hidden="true" />
      <div className="selection-toolbar__group">
        <button
          type="button"
          className={`selection-toolbar__button selection-toolbar__button--color ${
            textColorsOpen ? "is-active" : ""
          }`}
          title="Text color"
          aria-label="Text color"
          onMouseDown={(event) => {
            event.preventDefault();
            setTextColorsOpen((open) => !open);
            setHighlightColorsOpen(false);
          }}
        >
          <span
            className="selection-toolbar__text-color-glyph"
            style={{ borderBottomColor: activeTextColor }}
          >
            A
          </span>
        </button>
        {textColorsOpen ? (
          <ColorPopover
            title="Text color"
            presets={TEXT_COLOR_PRESETS}
            customColor={customTextColor}
            onPick={(color) => {
              setCustomTextColor(color);
              editor.chain().focus().setColor(color).run();
              setTextColorsOpen(false);
            }}
            onClear={() => {
              editor.chain().focus().unsetColor().run();
              setTextColorsOpen(false);
            }}
            clearLabel="Reset"
          />
        ) : null}
      </div>
      <div className="selection-toolbar__group">
        <button
          type="button"
          className={`selection-toolbar__button ${
            highlightColorsOpen ? "is-active" : ""
          }`}
          title="Highlight color"
          aria-label="Highlight color"
          onMouseDown={(event) => {
            event.preventDefault();
            setHighlightColorsOpen((open) => !open);
            setTextColorsOpen(false);
          }}
        >
          <ToolbarIcon id="highlightColor" />
        </button>
        {highlightColorsOpen ? (
          <ColorPopover
            title="Highlight color"
            presets={HIGHLIGHT_COLOR_PRESETS}
            customColor={customHighlightColor}
            onPick={(color) => {
              setCustomHighlightColor(color);
              editor.chain().focus().setHighlight({ color }).run();
              setHighlightColorsOpen(false);
            }}
            onClear={() => {
              editor.chain().focus().unsetHighlight().run();
              setHighlightColorsOpen(false);
            }}
            clearLabel="Clear"
          />
        ) : null}
      </div>
      <span className="selection-toolbar__divider" aria-hidden="true" />
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
      <span className="selection-toolbar__divider" aria-hidden="true" />
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
            setHeadingsOpen((open) => !open);
            setTextColorsOpen(false);
            setHighlightColorsOpen(false);
          }}
        >
          <ToolbarIcon id="heading" />
        </button>
        {headingsOpen ? (
          <div className="selection-toolbar__popover" role="group" aria-label="Heading level">
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`selection-toolbar__button selection-toolbar__button--compact ${
                  editor.isActive("heading", { level }) ? "is-active" : ""
                }`}
                title={`Heading ${level}`}
                aria-label={`Heading ${level}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleHeading({ level }).run();
                  setHeadingsOpen(false);
                }}
              >
                H{level}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
      <span className="selection-toolbar__divider" aria-hidden="true" />
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
      {linkDialog}
    </div>,
    document.body,
  );
}
