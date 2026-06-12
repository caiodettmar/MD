import type { AppConfig, TabDocument } from "../types";

interface StatusBarProps {
  tab: TabDocument | null;
  config: AppConfig;
  showRawPane: boolean;
}

function saveLabel(tab: TabDocument | null): string {
  if (!tab) {
    return "Ready";
  }

  switch (tab.saveStatus) {
    case "saving":
      return "Saving…";
    case "error":
      return "Save failed";
    case "dirty":
      return "Unsaved changes";
    default:
      return tab.lastSavedAt ? "Saved" : "Ready";
  }
}

export function StatusBar({ tab, config, showRawPane }: StatusBarProps) {

  return (
    <footer className="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__path" title={tab?.path ?? undefined}>
          {tab?.path ?? "Unsaved document"}
        </span>
      </div>
      <div className="status-bar__right">
        <span className="status-bar__meta">UTF-8</span>
        <span className={`status-bar__meta ${saveLabel(tab) === "Saved" ? "is-bold" : ""}`}>
          {saveLabel(tab)}
        </span>
        <span className="status-bar__meta">
          {config.wordWrap ? "Wrap" : "No wrap"}
        </span>
        <span className="status-bar__meta">{config.editorZoom}%</span>
        {showRawPane ? (
          <span className="status-bar__meta">Raw</span>
        ) : null}
      </div>
    </footer>
  );
}
