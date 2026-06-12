import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { buildImageNodeAttrs, isTauriRuntime, toMarkdownImageSrc } from "../lib/imageSrc";
import { pickImageFilePath } from "../lib/tauri";
import { useDraggable } from "../hooks/useDraggable";

interface ImageInsertDialogProps {
  open: boolean;
  editor: Editor | null;
  documentPath: string | null;
  editPos?: number | null;
  onClose: () => void;
}

export function ImageInsertDialog({
  open,
  editor,
  documentPath,
  editPos = null,
  onClose,
}: ImageInsertDialogProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [pickingFile, setPickingFile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditMode = editPos !== null;
  const { handleMouseDown, style: dragStyle } = useDraggable(open);

  useEffect(() => {
    if (!open || !editor) {
      return;
    }

    if (isEditMode && editPos !== null) {
      const node = editor.state.doc.nodeAt(editPos);
      if (node?.type.name === "image") {
        const markdownSrc = toMarkdownImageSrc(
          String(node.attrs.src ?? ""),
          node.attrs.markdownSrc as string | null | undefined,
          documentPath,
        );
        setSrc(markdownSrc);
        setAlt(String(node.attrs.alt ?? ""));
      }
    } else {
      setSrc("");
      setAlt("");
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [editPos, editor, isEditMode, open]);

  if (!open) {
    return null;
  }

  const applyImage = (markdownSrc: string, altText: string) => {
    if (!markdownSrc.trim() || !editor) {
      return;
    }

    const attrs = buildImageNodeAttrs(markdownSrc, documentPath, {
      alt: altText.trim() || null,
      title:
        isEditMode && editPos !== null
          ? ((editor.state.doc.nodeAt(editPos)?.attrs.title as
              | string
              | null
              | undefined) ?? null)
          : null,
    });

    if (isEditMode && editPos !== null) {
      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(editPos);
          if (!node || node.type.name !== "image") {
            return false;
          }

          if (dispatch) {
            dispatch(tr.setNodeMarkup(editPos, undefined, attrs));
          }

          return true;
        })
        .run();
    } else {
      editor.chain().focus().insertContent({ type: "image", attrs }).run();
    }

    onClose();
  };

  const insert = () => {
    applyImage(src, alt);
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
        style={dragStyle}
        onMouseDown={handleMouseDown}
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
        <h2 id="image-insert-title">
          {isEditMode ? "Change image path" : "Insert image"}
        </h2>
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
            {isEditMode ? "Update" : "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}
