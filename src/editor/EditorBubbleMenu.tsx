import { isTextSelection, posToDOMRect } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LinkEditDialog } from "../components/LinkEditDialog";
import {
  HIGHLIGHT_COLOR_PRESETS,
  TEXT_COLOR_PRESETS,
} from "./constants/colors";
import { markRegistry } from "./markRegistry";

interface EditorBubbleMenuProps {
  editor: Editor;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

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

function getToolbarPosition(editor: Editor): ToolbarPosition | null {
  if (!shouldShowSelectionToolbar(editor)) {
    return null;
  }

  const { from, to } = editor.state.selection;
  const rect = posToDOMRect(editor.view, from, to);

  return {
    top: rect.top - 8,
    left: rect.left + rect.width / 2,
  };
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [hasExistingLink, setHasExistingLink] = useState(false);

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

  const syncToolbar = useCallback(() => {
    const nextPosition = getToolbarPosition(editor);
    if (!nextPosition) {
      setVisible(false);
      return;
    }

    setPosition(nextPosition);
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      window.requestAnimationFrame(syncToolbar);
    };

    const handleBlur = () => {
      setVisible(false);
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

  return createPortal(
    <div
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
          onMouseDown={(event) => {
            event.preventDefault();
            entry.run(editor);
          }}
        >
          {entry.shortcutLabel ?? entry.label.slice(0, 1)}
        </button>
      ))}
      <span className="selection-toolbar__divider" aria-hidden="true" />
      {TEXT_COLOR_PRESETS.filter((preset) => preset.value).map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="selection-toolbar__color"
          title={`Text color: ${preset.label}`}
          style={{ backgroundColor: preset.value }}
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().setColor(preset.value).run();
          }}
        />
      ))}
      <button
        type="button"
        className="selection-toolbar__button"
        title="Reset text color"
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().unsetColor().run();
        }}
      >
        A
      </button>
      <span className="selection-toolbar__divider" aria-hidden="true" />
      {HIGHLIGHT_COLOR_PRESETS.filter((preset) => preset.value).map(
        (preset) => (
          <button
            key={`hl-${preset.id}`}
            type="button"
            className="selection-toolbar__color"
            title={`Highlight: ${preset.label}`}
            style={{ backgroundColor: preset.value }}
            onMouseDown={(event) => {
              event.preventDefault();
              editor
                .chain()
                .focus()
                .setHighlight({ color: preset.value })
                .run();
            }}
          />
        ),
      )}
      <button
        type="button"
        className="selection-toolbar__button"
        title="Remove highlight"
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().unsetHighlight().run();
        }}
      >
        ⊘
      </button>
      <span className="selection-toolbar__divider" aria-hidden="true" />
      <button
        type="button"
        className={`selection-toolbar__button ${
          editor.isActive("link") ? "is-active" : ""
        }`}
        title={editor.isActive("link") ? "Edit link" : "Add link"}
        onMouseDown={(event) => {
          event.preventDefault();
          openLinkDialog();
        }}
      >
        ://
      </button>
      {linkDialog}
    </div>,
    document.body,
  );
}
