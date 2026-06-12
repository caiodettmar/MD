import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_VERSION } from "../lib/appVersion";
import {
  checkForUpdates,
  RELEASES_URL,
  type UpdateCheckResult,
} from "../lib/updateCheck";
import { useDraggable } from "../hooks/useDraggable";

interface UpdateCheckDialogProps {
  open: boolean;
  onClose: () => void;
}

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

function statusMessage(result: UpdateCheckResult | null, checking: boolean) {
  if (checking || !result) {
    return "Checking for updates…";
  }

  if (result.latestVersion === null) {
    return (
      <>
        Automatic update checks are not configured yet. Compare your version with
        the latest release on GitHub, then download and run the installer if a
        newer build is available.
      </>
    );
  }

  if (result.updateAvailable) {
    return (
      <>
        A newer version ({result.latestVersion}) is available. Download the
        installer from the releases page, close MD, and run the setup to update.
      </>
    );
  }

  return <>You are on the latest release ({result.latestVersion}).</>;
}

export function UpdateCheckDialog({ open, onClose }: UpdateCheckDialogProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const { handleMouseDown, style: dragStyle } = useDraggable(open);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    void checkForUpdates().then((next) => {
      if (!cancelled) {
        setResult(next);
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card update-check-dialog"
        role="dialog"
        aria-labelledby="update-check-title"
        style={dragStyle}
        onMouseDown={handleMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="update-check-title">Check for updates</h2>
        <p>
          <strong>Installed version:</strong> {APP_VERSION}
        </p>
        <p>
          <strong>Latest available:</strong>{" "}
          {checking
            ? "…"
            : result?.latestVersion ?? "Unknown (manual check required)"}
        </p>
        <p className="modal-card__meta">{statusMessage(result, checking)}</p>
        <ol className="modal-card__steps">
          <li>Open the releases page and note the newest version number.</li>
          <li>If it is newer than {APP_VERSION}, download the Windows installer.</li>
          <li>Close MD, run the installer, and reopen the app.</li>
        </ol>
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
