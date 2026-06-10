import { useEditorStore } from "../stores/editorStore";
import type { EmojiSaveMode, ThemeMode } from "../types";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const config = useEditorStore((state) => state.config);
  const updateConfig = useEditorStore((state) => state.updateConfig);
  const resetConfig = useEditorStore((state) => state.resetConfig);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card settings-dialog"
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title">Settings</h2>

        <div className="settings-dialog__section">General</div>

        <label className="settings-dialog__row">
          <span>Theme</span>
          <select
            value={config.theme}
            onChange={(event) =>
              updateConfig({ theme: event.target.value as ThemeMode })
            }
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="settings-dialog__row">
          <span>Restore session on startup</span>
          <input
            type="checkbox"
            checked={config.restoreSession}
            onChange={(event) =>
              updateConfig({ restoreSession: event.target.checked })
            }
          />
        </label>

        <label className="settings-dialog__row">
          <span>Show raw markdown on startup</span>
          <input
            type="checkbox"
            checked={config.showRawOnStartup}
            onChange={(event) =>
              updateConfig({ showRawOnStartup: event.target.checked })
            }
          />
        </label>

        <label className="settings-dialog__row">
          <span>Check for updates on startup</span>
          <input
            type="checkbox"
            checked={config.checkUpdates}
            onChange={(event) =>
              updateConfig({ checkUpdates: event.target.checked })
            }
          />
        </label>

        <div className="settings-dialog__section">Editor</div>

        <label className="settings-dialog__row">
          <span>Font size ({config.fontSize}%)</span>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={config.fontSize}
            onChange={(event) =>
              updateConfig({ fontSize: Number(event.target.value) })
            }
          />
        </label>

        <label className="settings-dialog__row">
          <span>Word wrap</span>
          <input
            type="checkbox"
            checked={config.wordWrap}
            onChange={(event) =>
              updateConfig({ wordWrap: event.target.checked })
            }
          />
        </label>

        <label className="settings-dialog__row">
          <span>Default zoom ({config.editorZoom}%)</span>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={config.editorZoom}
            onChange={(event) =>
              updateConfig({ editorZoom: Number(event.target.value) })
            }
          />
        </label>

        <label className="settings-dialog__row">
          <span>Save emoji as</span>
          <select
            value={config.emojiSaveMode}
            onChange={(event) =>
              updateConfig({
                emojiSaveMode: event.target.value as EmojiSaveMode,
              })
            }
          >
            <option value="unicode">Unicode characters</option>
            <option value="shortcode">Shortcodes (:smile:)</option>
          </select>
        </label>

        <label className="settings-dialog__row">
          <span>Session autosave interval (ms)</span>
          <input
            type="number"
            min={500}
            step={500}
            value={config.autoSaveMs}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) {
                updateConfig({ autoSaveMs: Math.max(500, value) });
              }
            }}
          />
        </label>

        <div className="settings-dialog__actions">
          <button
            type="button"
            className="is-secondary"
            onClick={() => resetConfig()}
          >
            Reset to defaults
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
