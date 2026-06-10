import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { isTauriRuntime, toDisplayImageSrc } from "../lib/imageSrc";
import { pickImageFilePath } from "../lib/tauri";

interface ImageInsertDialogProps {
  open: boolean;
  editor: Editor | null;
  documentPath: string | null;
  onClose: () => void;
}

export function ImageInsertDialog({
  open,
  editor,
  documentPath,
  onClose,
}: ImageInsertDialogProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [pickingFile, setPickingFile] = useState(false);
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

  const insertImage = (markdownSrc: string, altText: string) => {
    if (!markdownSrc.trim() || !editor) {
      return;
    }

    const trimmedSrc = markdownSrc.trim();
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: toDisplayImageSrc(trimmedSrc, documentPath),
          alt: altText.trim() || null,
          markdownSrc: trimmedSrc,
        },
      })
      .run();
    onClose();
  };

  const insert = () => {
    insertImage(src, alt);
  };

  const browseLocalFile = async () => {
    if (!isTauriRuntime()) {
      return;
    }

    setPickingFile(true);
    try {
      const selected = await pickImageFilePath();
      if (!selected) {
        return;
      }

      setSrc(selected);
      inputRef.current?.focus();
    } finally {
      setPickingFile(false);
    }
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
          <span>Image URL or file path</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="https://example.com/image.png"
            value={src}
            onChange={(event) => setSrc(event.target.value)}
          />
        </label>
        {isTauriRuntime() ? (
          <div className="insert-dialog__actions insert-dialog__actions--inline">
            <button
              type="button"
              className="is-secondary"
              disabled={pickingFile}
              onClick={() => {
                void browseLocalFile();
              }}
            >
              {pickingFile ? "Opening…" : "Browse local file…"}
            </button>
          </div>
        ) : null}
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
