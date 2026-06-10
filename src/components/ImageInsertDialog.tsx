import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

interface ImageInsertDialogProps {
  open: boolean;
  editor: Editor | null;
  onClose: () => void;
}

export function ImageInsertDialog({
  open,
  editor,
  onClose,
}: ImageInsertDialogProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSrc("");
      setAlt("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const insert = () => {
    const trimmed = src.trim();
    if (!trimmed || !editor) {
      return;
    }

    editor
      .chain()
      .focus()
      .setImage({ src: trimmed, alt: alt.trim() || undefined })
      .run();
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card insert-dialog"
        role="dialog"
        aria-labelledby="image-insert-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Enter") {
            event.preventDefault();
            insert();
          }
        }}
      >
        <h2 id="image-insert-title">Insert image</h2>
        <label className="insert-dialog__field">
          <span>Image URL</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="https://example.com/image.png"
            value={src}
            onChange={(event) => setSrc(event.target.value)}
          />
        </label>
        <label className="insert-dialog__field">
          <span>Alt text (optional)</span>
          <input
            type="text"
            placeholder="Description"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>
        <div className="insert-dialog__actions">
          <button type="button" className="is-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!src.trim()} onClick={insert}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
