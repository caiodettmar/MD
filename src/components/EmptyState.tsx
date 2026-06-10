interface EmptyStateProps {
  onOpen: () => void;
  onNew: () => void;
}

export function EmptyState({ onOpen, onNew }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__card">
        <h2>Write in Markdown</h2>
        <p>Open an existing `.md` file or start a new document.</p>
        <div className="empty-state__actions">
          <button type="button" onClick={onOpen}>
            Open file
          </button>
          <button type="button" className="is-secondary" onClick={onNew}>
            New tab
          </button>
        </div>
        <p className="empty-state__hint">
          Drag and drop a Markdown file anywhere in this window.
        </p>
      </div>
    </div>
  );
}
