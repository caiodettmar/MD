import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { LinkEditDialog } from "./LinkEditDialog";

interface LinkInsertDialogProps {
  open: boolean;
  editor: Editor | null;
  onClose: () => void;
}

export function LinkInsertDialog({
  open,
  editor,
  onClose,
}: LinkInsertDialogProps) {
  const [href, setHref] = useState("");
  const [title, setTitle] = useState("");
  const [hasExistingLink, setHasExistingLink] = useState(false);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!open || !editor) {
      openedRef.current = false;
      return;
    }

    if (!openedRef.current) {
      const attrs = editor.getAttributes("link");
      setHref(typeof attrs.href === "string" ? attrs.href : "");
      setTitle(typeof attrs.title === "string" ? attrs.title : "");
      setHasExistingLink(editor.isActive("link"));
      openedRef.current = true;
    }
  }, [editor, open]);

  const apply = (nextHref: string, nextTitle: string) => {
    if (!editor) {
      return;
    }

    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: nextHref,
          marks: [
            {
              type: "link",
              attrs: { href: nextHref, title: nextTitle || null },
            },
          ],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: nextHref, title: nextTitle || null })
        .run();
    }
    onClose();
  };

  const remove = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <LinkEditDialog
      open={open}
      initialHref={href}
      initialTitle={title}
      hasExistingLink={hasExistingLink}
      onApply={apply}
      onRemove={remove}
      onClose={onClose}
    />
  );
}
