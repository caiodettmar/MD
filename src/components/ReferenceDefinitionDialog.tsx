import { useEffect, useId, useRef, useState } from "react";
import { useDraggable } from "../hooks/useDraggable";

export interface ReferenceDefinitionDialogValues {
  id: string;
  href: string;
  title: string;
}

interface ReferenceDefinitionDialogProps {
  initialId: string | null;
  onCancel: () => void;
  onConfirm: (values: ReferenceDefinitionDialogValues) => void;
}

export function ReferenceDefinitionDialog({
  initialId,
  onCancel,
  onConfirm,
}: ReferenceDefinitionDialogProps) {
  const titleId = useId();
  const idFieldId = useId();
  const hrefFieldId = useId();
  const optionalTitleFieldId = useId();
  const hrefRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState(initialId ?? "");
  const [href, setHref] = useState("");
  const [title, setTitle] = useState("");
  const { handleMouseDown, style: dragStyle } = useDraggable(initialId !== null);

  useEffect(() => {
    setId(initialId ?? "");
    setHref("");
    setTitle("");
    hrefRef.current?.focus();
  }, [initialId]);

  if (!initialId) {
    return null;
  }

  const canConfirm = id.trim().length > 0 && href.trim().length > 0;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card ref-def-dialog"
        role="dialog"
        aria-labelledby={titleId}
        style={dragStyle}
        onMouseDown={handleMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Add reference definition</h2>
        <p className="ref-def-dialog__lead">
          Define the link target for{" "}
          <code>[{initialId}]:</code>. The definition is stored at the end of
          the document and hidden while you write.
        </p>

        <form
          className="ref-def-dialog__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canConfirm) {
              return;
            }

            onConfirm({
              id: id.trim(),
              href: href.trim(),
              title: title.trim(),
            });
          }}
        >
          <label className="ref-def-dialog__field" htmlFor={idFieldId}>
            <span>Reference name</span>
            <input
              id={idFieldId}
              value={id}
              onChange={(event) => setId(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="ref-def-dialog__field" htmlFor={hrefFieldId}>
            <span>Address</span>
            <input
              id={hrefFieldId}
              ref={hrefRef}
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://example.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label
            className="ref-def-dialog__field"
            htmlFor={optionalTitleFieldId}
          >
            <span>Title (optional)</span>
            <input
              id={optionalTitleFieldId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional link title"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <div className="ref-def-dialog__actions">
            <button type="button" className="is-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={!canConfirm}>
              Add reference
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
