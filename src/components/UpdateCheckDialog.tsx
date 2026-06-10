import { openUrl } from "@tauri-apps/plugin-opener";

interface UpdateCheckDialogProps {
  open: boolean;
  onClose: () => void;
}

const APP_VERSION = "0.1.0";
const RELEASES_URL = "https://github.com/caiodettmar/md/releases";

async function openReleasesPage() {
  try {
    if ("__TAURI_INTERNALS__" in window) {
      await openUrl(RELEASES_URL);
      return;
    }
  } catch {
    // fall through to browser
  }
  window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
}

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
          Automatic in-app updates are not configured yet. Visit the releases
          page to download a newer build when one is available.
        </p>
        <div className="insert-dialog__actions">
          <button
            type="button"
            className="is-secondary"
            onClick={() => void openReleasesPage()}
          >
            View releases
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
