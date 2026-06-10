import { posToDOMRect } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "../stores/editorStore";

interface EditorImageMenuProps {
  editor: Editor;
}

interface MenuPosition {
  top: number;
  left: number;
}

function getSelectedImage(editor: Editor): { pos: number } | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) {
    return null;
  }

  if (selection.node.type.name !== "image") {
    return null;
  }

  return { pos: selection.from };
}

export function EditorImageMenu({ editor }: EditorImageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const [imagePos, setImagePos] = useState<number | null>(null);
  const openImageEdit = useEditorStore((state) => state.openImageEdit);

  const syncMenu = useCallback(() => {
    if (!editor.isEditable || editor.isDestroyed || !editor.view.hasFocus()) {
      setVisible(false);
      setImagePos(null);
      return;
    }

    const selected = getSelectedImage(editor);
    if (!selected) {
      setVisible(false);
      setImagePos(null);
      return;
    }

    const rect = posToDOMRect(editor.view, selected.pos, selected.pos + 1);
    setImagePos(selected.pos);
    setVisible(true);

    window.requestAnimationFrame(() => {
      const menu = menuRef.current;
      const menuHeight = menu?.offsetHeight ?? 40;
      setPosition({
        top: Math.max(8, rect.top - menuHeight - 8),
        left: Math.max(8, rect.left + rect.width / 2),
      });
    });
  }, [editor]);

  useEffect(() => {
    const handleUpdate = () => {
      window.requestAnimationFrame(syncMenu);
    };

    syncMenu();
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);
    editor.on("blur", () => {
      setVisible(false);
      setImagePos(null);
    });

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor, syncMenu]);

  if (!visible || imagePos === null) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className="selection-toolbar image-node-menu"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translate(-50%, 0)",
        zIndex: 40,
      }}
    >
      <button
        type="button"
        className="selection-toolbar__button selection-toolbar__button--label"
        onMouseDown={(event) => {
          event.preventDefault();
          openImageEdit(imagePos);
        }}
      >
        Change path
      </button>
      <button
        type="button"
        className="selection-toolbar__button selection-toolbar__button--label"
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().deleteSelection().run();
        }}
      >
        Delete image
      </button>
    </div>,
    document.body,
  );
}
