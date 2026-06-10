import type { EditorState } from "@tiptap/pm/state";
import { posToDOMRect } from "@tiptap/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { EMOJI_PRESETS } from "../editor/constants/emojiPresets";
import { insertDefaultTable } from "../editor/blockCommands";
import { insertDefinitionList } from "../editor/definitionListExtension";
import { insertTableOfContents } from "../editor/tableOfContentsExtension";
import { isInsideLinkReferenceDefinition } from "../editor/linkReferenceDefinitionUtils";
import { markRegistry } from "../editor/markRegistry";
import { scoreSlashMatch } from "../editor/slashMenuUtils";
import { useEditorStore } from "../stores/editorStore";

interface SlashMenuProps {
  editor: Editor;
}

interface SlashMenuItem {
  key: string;
  section?: string;
  className: string;
  content: ReactNode;
  run: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

const blockItems = [
  {
    id: "block-h1",
    label: "Heading 1",
    hint: "#",
    keywords: ["h1", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "block-h2",
    label: "Heading 2",
    hint: "##",
    keywords: ["h2", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "block-bullet",
    label: "Bullet list",
    hint: "-",
    keywords: ["bullet", "list", "ul"],
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "block-ordered",
    label: "Numbered list",
    hint: "1.",
    keywords: ["numbered", "ordered", "ol"],
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "block-task",
    label: "Task list",
    hint: "[ ]",
    keywords: ["task", "todo", "checkbox"],
    run: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "block-quote",
    label: "Quote",
    hint: ">",
    keywords: ["quote", "blockquote"],
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "block-code",
    label: "Code block",
    hint: "```",
    keywords: ["codeblock", "fence"],
    run: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "block-hr",
    label: "Divider",
    hint: "---",
    keywords: ["hr", "divider", "rule"],
    run: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "block-table",
    label: "Table",
    hint: "3×3",
    keywords: ["table", "grid"],
    run: (e: Editor) => insertDefaultTable(e),
  },
  {
    id: "block-definition-list",
    label: "Definition list",
    hint: "dl",
    keywords: ["definition", "deflist", "dl", "term"],
    run: (e: Editor) => insertDefinitionList(e),
  },
  {
    id: "block-toc",
    label: "Table of contents",
    hint: "TOC",
    keywords: ["toc", "contents", "outline"],
    run: (e: Editor) => insertTableOfContents(e),
  },
  {
    id: "block-image",
    label: "Image",
    hint: "img",
    keywords: ["image", "img", "picture"],
    run: () => {
      useEditorStore.getState().setImageDialogOpen(true);
    },
  },
  {
    id: "block-link",
    label: "Link",
    hint: "url",
    keywords: ["link", "url", "href"],
    run: () => {
      useEditorStore.getState().setLinkDialogOpen(true);
    },
  },
];

function matchesSlashQuery(
  query: string,
  label: string,
  keywords: string[],
): boolean {
  return scoreSlashMatch(query, label, keywords) >= 0;
}

export { scoreSlashMatch };

export function slashQuery(editor: Editor): string | null {
  return slashQueryFromState(editor.state);
}

export function slashQueryFromState(state: EditorState): string | null {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) {
    return null;
  }

  if (isInsideLinkReferenceDefinition(state.doc, $from.pos)) {
    return null;
  }

  const text = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\ufffc",
  );

  const slashAt = text.lastIndexOf("/");
  if (slashAt < 0) {
    return null;
  }

  if (slashAt > 0 && !/\s/u.test(text.charAt(slashAt - 1))) {
    return null;
  }

  const query = text.slice(slashAt + 1);
  if (!/^[a-z0-9_-]*$/iu.test(query)) {
    return null;
  }

  return query.toLowerCase();
}

export function isSlashMenuOpen(editor: Editor): boolean {
  return slashQueryFromState(editor.state) !== null;
}

function removeSlashTrigger(editor: Editor) {
  const { $from } = editor.state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const slashIndex = text.lastIndexOf("/");
  if (slashIndex < 0) {
    return;
  }

  const deleteFrom = $from.start() + slashIndex;
  editor.chain().focus().deleteRange({ from: deleteFrom, to: $from.pos }).run();
}

function insertEmoji(editor: Editor, emoji: string) {
  removeSlashTrigger(editor);
  editor.chain().focus().insertContent(emoji).run();
}

function scrollSelectedMenuItem(container: HTMLElement, selected: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const selectedRect = selected.getBoundingClientRect();

  if (selectedRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - selectedRect.top;
  } else if (selectedRect.bottom > containerRect.bottom) {
    container.scrollTop += selectedRect.bottom - containerRect.bottom;
  }
}

function getSlashMenuPosition(editor: Editor): MenuPosition | null {
  if (!isSlashMenuOpen(editor)) {
    return null;
  }

  const { from } = editor.state.selection;
  const rect = posToDOMRect(editor.view, from, from);
  const menuWidth = 260;
  const menuHeight = 320;
  const margin = 8;

  let top = rect.bottom + 6;
  let left = rect.left;

  left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));
  if (top + menuHeight > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - menuHeight - 6);
  }

  return {
    top,
    left,
  };
}

export function SlashMenu({ editor }: SlashMenuProps) {
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<SlashMenuItem[]>([]);
  const selectedIndexRef = useRef(0);

  const emojiMode = showEmojiPanel || filterQuery.startsWith("emoji");

  const syncMenu = useCallback(() => {
    const nextQuery = slashQuery(editor);
    const isOpen = nextQuery !== null;

    setMenuOpen(isOpen);
    setFilterQuery(nextQuery ?? "");

    if (!isOpen) {
      return;
    }

    const nextPosition = getSlashMenuPosition(editor);
    if (nextPosition) {
      setPosition(nextPosition);
    }
  }, [editor]);

  useEffect(() => {
    const handleTransaction = ({ transaction }: { transaction: { docChanged: boolean; selectionSet: boolean } }) => {
      if (!transaction.docChanged && !transaction.selectionSet) {
        return;
      }

      syncMenu();
    };

    syncMenu();
    editor.on("transaction", handleTransaction);
    editor.on("selectionUpdate", syncMenu);

    return () => {
      editor.off("transaction", handleTransaction);
      editor.off("selectionUpdate", syncMenu);
    };
  }, [editor, syncMenu]);

  useEffect(() => {
    if (!menuOpen) {
      setShowEmojiPanel(false);
    }
  }, [menuOpen]);

  const items = useMemo<SlashMenuItem[]>(() => {
    if (!menuOpen) {
      return [];
    }

    if (emojiMode) {
      return EMOJI_PRESETS.filter(
        (entry) =>
          !filterQuery ||
          emojiMode ||
          entry.name.includes(filterQuery) ||
          entry.emoji.includes(filterQuery),
      ).map((entry) => ({
        key: `emoji-${entry.name}`,
        className: "slash-menu__emoji",
        content: entry.emoji,
        run: () => {
          insertEmoji(editor, entry.emoji);
          setShowEmojiPanel(false);
        },
      }));
    }

    const menuItems: SlashMenuItem[] = [];

    const marks = markRegistry
      .map((entry) => ({
        entry,
        score: scoreSlashMatch(filterQuery, entry.label, entry.slashKeywords),
      }))
      .filter(({ score }) => score >= 0)
      .sort((left, right) => right.score - left.score);

    marks.forEach(({ entry }, index) => {
      menuItems.push({
        key: `mark-${entry.id}`,
        section: index === 0 ? "Formatting" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span>{entry.label}</span>
            <span className="slash-menu__hint">{entry.shortcutLabel ?? ""}</span>
          </>
        ),
        run: () => {
          removeSlashTrigger(editor);
          entry.run(editor);
        },
      });
    });

    const blocks = blockItems
      .map((entry) => ({
        entry,
        score: scoreSlashMatch(filterQuery, entry.label, entry.keywords),
      }))
      .filter(({ score }) => score >= 0)
      .sort((left, right) => right.score - left.score);

    blocks.forEach(({ entry }, index) => {
      menuItems.push({
        key: entry.id,
        section: index === 0 ? "Blocks" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span>{entry.label}</span>
            <span className="slash-menu__hint">{entry.hint}</span>
          </>
        ),
        run: () => {
          removeSlashTrigger(editor);
          entry.run(editor);
        },
      });
    });

    if (matchesSlashQuery(filterQuery, "Emoji", ["emoji"])) {
      menuItems.push({
        key: "emoji-panel",
        className: "slash-menu__item",
        content: (
          <>
            <span>Emoji</span>
            <span className="slash-menu__hint">→</span>
          </>
        ),
        run: () => setShowEmojiPanel(true),
      });
    }

    return menuItems;
  }, [editor, emojiMode, filterQuery, menuOpen]);

  itemsRef.current = items;
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterQuery, emojiMode, menuOpen, items.length]);

  const runSelectedItem = useCallback(() => {
    const item = itemsRef.current[selectedIndexRef.current];
    item?.run();
  }, []);

  useEffect(() => {
    if (!menuOpen || items.length === 0) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(
          (current) => (current + 1) % itemsRef.current.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (current) =>
            (current - 1 + itemsRef.current.length) % itemsRef.current.length,
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        runSelectedItem();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (emojiMode) {
          setShowEmojiPanel(false);
          return;
        }
        removeSlashTrigger(editor);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor, emojiMode, items.length, menuOpen, runSelectedItem]);

  useEffect(() => {
    const container = menuRef.current?.parentElement;
    const selected = menuRef.current?.querySelector(".is-selected");

    if (container instanceof HTMLElement && selected instanceof HTMLElement) {
      scrollSelectedMenuItem(container, selected);
    }
  }, [selectedIndex]);

  if (!menuOpen || items.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="slash-menu"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 40,
        maxHeight: "320px",
      }}
    >
      <div ref={menuRef}>
        {emojiMode ? (
          <>
            <div className="slash-menu__section">Emoji</div>
            <div className="slash-menu__emoji-grid">
              {items.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${item.className}${
                    index === selectedIndex ? " is-selected" : ""
                  }`}
                  title={
                    item.key.startsWith("emoji-")
                      ? `:${item.key.slice(6)}:`
                      : undefined
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    item.run();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.content}
                </button>
              ))}
            </div>
          </>
        ) : (
          items.map((item, index) => (
            <div key={item.key}>
              {item.section ? (
                <div className="slash-menu__section">{item.section}</div>
              ) : null}
              <button
                type="button"
                className={`${item.className}${
                  index === selectedIndex ? " is-selected" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  item.run();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.content}
              </button>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}
