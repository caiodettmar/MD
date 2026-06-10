import { isTextSelection, posToDOMRect } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TEXT_COLOR_PRESETS } from "./constants/colors";
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

  if (!visible) {
    return null;
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
    </div>,
    document.body,
  );
}
