import { useEffect, useRef, useState } from "react";
import { useDraggable } from "../hooks/useDraggable";

interface LinkEditDialogProps {
  open: boolean;
  initialHref: string;
  initialTitle: string;
  hasExistingLink: boolean;
  onApply: (href: string, title: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function LinkEditDialog({
  open,
  initialHref,
  initialTitle,
  hasExistingLink,
  onApply,
  onRemove,
  onClose,
}: LinkEditDialogProps) {
  const [href, setHref] = useState(initialHref);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleMouseDown, style: dragStyle } = useDraggable(open);

  useEffect(() => {
    if (open) {
      setHref(initialHref);
      setTitle(initialTitle);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialHref, initialTitle, open]);

  if (!open) {
    return null;
  }

  const apply = () => {
    const trimmed = href.trim();
    if (!trimmed) {
      return;
    }
    onApply(trimmed, title.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card insert-dialog"
        role="dialog"
        aria-labelledby="link-edit-title"
        style={dragStyle}
        onMouseDown={handleMouseDown}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
      >
        <h2 id="link-edit-title">{hasExistingLink ? "Edit link" : "Add link"}</h2>
        <label className="insert-dialog__field">
          <span>URL</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="https://example.com"
            value={href}
            onChange={(event) => setHref(event.target.value)}
          />
        </label>
        <label className="insert-dialog__field">
          <span>Title (optional)</span>
          <input
            type="text"
            placeholder="Tooltip text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="insert-dialog__actions">
          {hasExistingLink ? (
            <button type="button" className="is-danger" onClick={onRemove}>
              Remove link
            </button>
          ) : null}
          <button type="button" className="is-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!href.trim()} onClick={apply}>
            {hasExistingLink ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
