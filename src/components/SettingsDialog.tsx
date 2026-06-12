import { useEffect, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { DEFAULT_CONFIG, type AppConfig, type EmojiSaveMode, type ThemeMode } from "../types";
import { useDraggable } from "../hooks/useDraggable";
import { CustomSelect } from "./CustomSelect";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const themeOptions = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" }
];

const emojiSaveModeOptions = [
  { value: "unicode", label: "Unicode characters" },
  { value: "shortcode", label: "Shortcodes (:smile:)" }
];

const maxWidthPresetOptions = [
  { value: "Default", label: "Default (720px)" },
  { value: "A0", label: "A0 (841mm)" },
  { value: "A1", label: "A1 (594mm)" },
  { value: "A2", label: "A2 (420mm)" },
  { value: "A3", label: "A3 (297mm)" },
  { value: "A4", label: "A4 (210mm)" },
  { value: "A5", label: "A5 (148mm)" },
  { value: "A6", label: "A6 (105mm)" },
  { value: "Letter", label: "Letter (8.5in)" },
  { value: "Legal", label: "Legal (8.5in)" },
  { value: "Custom", label: "Custom" }
];

const maxWidthCustomUnitOptions = [
  { value: "px", label: "px" },
  { value: "cm", label: "cm" },
  { value: "in", label: "in" },
  { value: "mm", label: "mm" },
  { value: "em", label: "em" },
  { value: "rem", label: "rem" },
  { value: "%", label: "%" }
];

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const config = useEditorStore((state) => state.config);
  const updateConfig = useEditorStore((state) => state.updateConfig);
  const { handleMouseDown, style: dragStyle } = useDraggable(open);

  // Local state to hold configuration modifications
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  // Sync local state when the dialog is opened
  useEffect(() => {
    if (open) {
      setLocalConfig(config);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const autoSaveMins = parseFloat((localConfig.autoSaveMs / 60000).toFixed(3));
  const getAutoSaveText = (val: number) => {
    if (val <= 0.01) return "Faster (0.01)";
    if (val >= 0.06) return "Slower (0.06)";
    if (Math.abs(val - 0.033) <= 0.002) return "Balanced (0.033)";
    return val.toFixed(3);
  };

  const handleSaveAndClose = () => {
    updateConfig(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig({
      ...DEFAULT_CONFIG,
      recentFiles: localConfig.recentFiles,
    });
  };

  return (
    <div className="modal-backdrop settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        style={dragStyle}
        onMouseDown={handleMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-dialog__header">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="material-symbols-outlined settings-dialog__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            close
          </button>
        </header>

        <div className="settings-dialog__content">
          <div className="settings-dialog__group">
            <h5 className="settings-dialog__section">General</h5>
            <div className="settings-dialog__rows">
              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Theme</span>
                <CustomSelect
                  value={localConfig.theme}
                  options={themeOptions}
                  onChange={(val) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      theme: val as ThemeMode,
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Restore session on startup</span>
                <input
                  type="checkbox"
                  checked={localConfig.restoreSession}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      restoreSession: event.target.checked,
                    }))
                  }
                />
              </label>

              {localConfig.restoreSession && (
                <label className="settings-dialog__row">
                  <span className="settings-dialog__row-label">
                    Session autosave: {getAutoSaveText(autoSaveMins)}
                  </span>
                  <input
                    type="range"
                    min={0.01}
                    max={0.06}
                    step={0.001}
                    value={autoSaveMins}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) {
                        let ms = Math.round(value * 60000);
                        if (Math.abs(value - 0.033) < 0.0005) {
                          ms = 2000;
                        }
                        setLocalConfig((prev) => ({
                          ...prev,
                          autoSaveMs: Math.max(500, ms),
                        }));
                      }
                    }}
                  />
                </label>
              )}

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Show "Edit References" button</span>
                <input
                  type="checkbox"
                  checked={localConfig.showEditReferences !== false}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      showEditReferences: event.target.checked,
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Show raw markdown on startup</span>
                <input
                  type="checkbox"
                  checked={localConfig.showRawOnStartup}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      showRawOnStartup: event.target.checked,
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Check for updates on startup</span>
                <input
                  type="checkbox"
                  checked={localConfig.checkUpdates}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      checkUpdates: event.target.checked,
                    }))
                  }
                />
              </label>


            </div>
          </div>

          <div className="settings-dialog__group">
            <h5 className="settings-dialog__section">Editor</h5>
            <div className="settings-dialog__rows">
              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Font size ({localConfig.fontSize}%)</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={localConfig.fontSize}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      fontSize: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Word wrap</span>
                <input
                  type="checkbox"
                  checked={localConfig.wordWrap}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      wordWrap: event.target.checked,
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Default zoom ({localConfig.editorZoom}%)</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={localConfig.editorZoom}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      editorZoom: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Save emoji as</span>
                <CustomSelect
                  value={localConfig.emojiSaveMode}
                  options={emojiSaveModeOptions}
                  onChange={(val) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      emojiSaveMode: val as EmojiSaveMode,
                    }))
                  }
                />
              </label>


              <label className="settings-dialog__row">
                <span className="settings-dialog__row-label">Limit content max width</span>
                <input
                  type="checkbox"
                  checked={localConfig.useMaxWidth !== false}
                  onChange={(event) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      useMaxWidth: event.target.checked,
                    }))
                  }
                />
              </label>

              {localConfig.useMaxWidth !== false && (
                <>
                  <label className="settings-dialog__row">
                    <span className="settings-dialog__row-label">Max width size</span>
                    <CustomSelect
                      value={localConfig.maxWidthPreset || "Default"}
                      options={maxWidthPresetOptions}
                      onChange={(val) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          maxWidthPreset: val,
                        }))
                      }
                    />
                  </label>

                  {localConfig.maxWidthPreset === "Custom" && (
                    <label className="settings-dialog__row">
                      <span className="settings-dialog__row-label">Custom width</span>
                      <div className="settings-dialog__custom-width-inputs">
                        <input
                          type="number"
                          min={1}
                          value={localConfig.maxWidthCustomValue ?? 720}
                          className="settings-dialog__number-input"
                          onChange={(event) => {
                            const val = Number(event.target.value);
                            setLocalConfig((prev) => ({
                              ...prev,
                              maxWidthCustomValue: isNaN(val) ? 720 : val,
                            }));
                          }}
                        />
                        <CustomSelect
                          value={localConfig.maxWidthCustomUnit || "px"}
                          options={maxWidthCustomUnitOptions}
                          onChange={(val) =>
                            setLocalConfig((prev) => ({
                              ...prev,
                              maxWidthCustomUnit: val,
                            }))
                          }
                          className="settings-dialog__select-wrapper--unit"
                        />
                      </div>
                    </label>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="settings-dialog__footer">
          <button
            type="button"
            className="settings-dialog__btn settings-dialog__btn--secondary"
            onClick={handleReset}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="settings-dialog__btn settings-dialog__btn--primary"
            onClick={handleSaveAndClose}
          >
            Save & Close
          </button>
        </footer>
      </div>
    </div>
  );
}
