interface RawPaneProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

export function RawPane({ markdown, onChange }: RawPaneProps) {
  return (
    <div className="raw-pane">
      <div className="raw-pane__label">Raw Markdown</div>
      <textarea
        className="raw-pane__textarea"
        value={markdown}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
