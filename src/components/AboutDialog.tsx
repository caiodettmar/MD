interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="about-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="about-title">About MD</h2>
        <p>
          MD is a lightweight WYSIWYG Markdown editor for Windows. Version 0.1.0
        </p>
        <p className="modal-card__meta">
          Built with Tauri, React, and TipTap.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
