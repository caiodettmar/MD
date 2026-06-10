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
      <span className="status-bar__path">
        {tab?.path ?? "Unsaved document"}
      </span>
      <span className="status-bar__meta">UTF-8</span>
      <span className="status-bar__meta">{saveLabel(tab)}</span>
      <span className="status-bar__meta">
        {config.wordWrap ? "Wrap" : "No wrap"}
      </span>
      <span className="status-bar__meta">{config.editorZoom}%</span>
      {showRawPane ? (
        <span className="status-bar__meta">Raw</span>
      ) : null}
    </footer>
  );
}
