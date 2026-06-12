import { useDraggable } from "../hooks/useDraggable";

interface LinkConfirmDialogProps {
  href: string | null;
  onCancel: () => void;
  onConfirm: (href: string) => void;
}

export function LinkConfirmDialog({
  href,
  onCancel,
  onConfirm,
}: LinkConfirmDialogProps) {
  const { handleMouseDown, style: dragStyle } = useDraggable(!!href);

  if (!href) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card link-confirm-dialog"
        role="dialog"
        aria-labelledby="link-confirm-title"
        style={dragStyle}
        onMouseDown={handleMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="link-confirm-title">Open external link?</h2>
        <p>
          This link will open in your default browser. Verify the address before
          continuing.
        </p>
        <div className="link-confirm-dialog__url" title={href}>
          {href}
        </div>
        <div className="link-confirm-dialog__actions">
          <button type="button" className="is-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(href)}>
            Open link
          </button>
        </div>
      </div>
    </div>
  );
}
