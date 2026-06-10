interface UpdateCheckDialogProps {
  open: boolean;
  onClose: () => void;
}

const APP_VERSION = "0.1.0";

export function UpdateCheckDialog({ open, onClose }: UpdateCheckDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="update-check-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="update-check-title">Check for updates</h2>
        <p>You are running MD version {APP_VERSION}.</p>
        <p className="modal-card__meta">
          Automatic update checks are not configured yet — this build has no
          release endpoint. Updates will be distributed manually until a
          release channel is set up.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
