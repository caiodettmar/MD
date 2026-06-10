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
  if (!href) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card link-confirm-dialog"
        role="dialog"
        aria-labelledby="link-confirm-title"
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
