import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  addLinkReferenceDefinition,
  listLinkReferenceDefinitions,
  removeLinkReferenceDefinition,
  updateLinkReferenceDefinition,
  type LinkReferenceDefinitionEntry,
} from "../editor/linkReferenceDefinitionUtils";

interface ReferenceDefinitionsPanelProps {
  editor: Editor | null;
  open: boolean;
}

interface DraftReference {
  id: string;
  href: string;
  title: string;
}

function emptyDraft(): DraftReference {
  return { id: "", href: "", title: "" };
}

export function ReferenceDefinitionsPanel({
  editor,
  open,
}: ReferenceDefinitionsPanelProps) {
  const [entries, setEntries] = useState<LinkReferenceDefinitionEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftReference>>({});
  const [newReference, setNewReference] = useState(emptyDraft);

  const refreshEntries = useCallback(() => {
    if (!editor) {
      setEntries([]);
      return;
    }

    setEntries(
      listLinkReferenceDefinitions(editor.state.doc).filter(
        (entry) => entry.complete,
      ),
    );
  }, [editor]);

  useEffect(() => {
    refreshEntries();
    if (!editor) {
      return;
    }

    const handleUpdate = () => {
      refreshEntries();
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, refreshEntries]);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<number, DraftReference> = {};
      for (const entry of entries) {
        next[entry.pos] = current[entry.pos] ?? {
          id: entry.id,
          href: entry.href,
          title: entry.title ?? "",
        };
      }
      return next;
    });
  }, [entries]);



  const applyDraft = (entry: LinkReferenceDefinitionEntry) => {
    if (!editor) {
      return;
    }

    const draft = drafts[entry.pos];
    if (!draft) {
      return;
    }

    updateLinkReferenceDefinition(editor, entry.pos, {
      id: draft.id,
      href: draft.href,
      title: draft.title || null,
    });
  };

  const handleRemove = (entry: LinkReferenceDefinitionEntry) => {
    if (!editor) {
      return;
    }

    removeLinkReferenceDefinition(editor, entry.pos);
  };

  const handleAdd = () => {
    if (!editor) {
      return;
    }

    const created = addLinkReferenceDefinition(
      editor,
      newReference.id,
      newReference.href,
      newReference.title || null,
    );

    if (created) {
      setNewReference(emptyDraft());
    }
  };

  if (!open) {
    return null;
  }

  return (
    <section
      className="references-panel is-open"
      aria-label="Reference definitions"
    >
      <div className="references-panel__body">
        {entries.length > 0 && (
          <ul className="references-panel__list">
            {entries.map((entry) => {
              const draft = drafts[entry.pos] ?? {
                id: entry.id,
                href: entry.href,
                title: entry.title ?? "",
              };

              return (
                <li key={entry.pos} className="references-panel__item">
                  <label className="references-panel__field">
                    <span>ID</span>
                    <input
                      value={draft.id}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [entry.pos]: {
                            ...draft,
                            id: event.target.value,
                          },
                        }))
                      }
                      onBlur={() => applyDraft(entry)}
                      spellCheck={false}
                    />
                  </label>
                  <label className="references-panel__field">
                    <span>URL</span>
                    <input
                      value={draft.href}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [entry.pos]: {
                            ...draft,
                            href: event.target.value,
                          },
                        }))
                      }
                      onBlur={() => applyDraft(entry)}
                      spellCheck={false}
                    />
                  </label>
                  <label className="references-panel__field">
                    <span>Title</span>
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [entry.pos]: {
                            ...draft,
                            title: event.target.value,
                          },
                        }))
                      }
                      onBlur={() => applyDraft(entry)}
                      spellCheck={false}
                    />
                  </label>
                  <button
                    type="button"
                    className="references-panel__remove"
                    onClick={() => handleRemove(entry)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="references-panel__add">
          <h3 className="references-panel__add-title">ADD REFERENCE</h3>
          <p className="references-panel__description">
            Reference definitions are hidden in the document while you write.
            Type <code>[id]:</code> in the editor to add one, or use the
            form below.
          </p>
          <div className="references-panel__add-grid">
            <input
              placeholder="id"
              value={newReference.id}
              onChange={(event) =>
                setNewReference((current) => ({
                  ...current,
                  id: event.target.value,
                }))
              }
              spellCheck={false}
            />
            <input
              placeholder="https://example.com"
              value={newReference.href}
              onChange={(event) =>
                setNewReference((current) => ({
                  ...current,
                  href: event.target.value,
                }))
              }
              spellCheck={false}
            />
            <input
              placeholder="Optional title"
              value={newReference.title}
              onChange={(event) =>
                setNewReference((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              spellCheck={false}
            />
            <button type="button" onClick={handleAdd}>
              Add
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
