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
import { EmojiPicker } from "./EmojiPicker";
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

function getSlashIcon(key: string): string | null {
  if (key.startsWith("mark-")) {
    const markId = key.slice(5);
    switch (markId) {
      case "bold": return "format_bold";
      case "italic": return "format_italic";
      case "strike": return "strikethrough_s";
      case "highlight": return "ink_highlighter";
      case "underline": return "format_underlined";
      case "code": return "code";
      case "subscript": return "subscript";
      case "superscript": return "superscript";
      default: return null;
    }
  }
  switch (key) {
    case "block-h1": return "format_h1";
    case "block-h2": return "format_h2";
    case "block-h3": return "format_h3";
    case "block-h4": return "format_h4";
    case "block-h5": return "format_h5";
    case "block-h6": return "format_h6";
    case "block-bullet": return "format_list_bulleted";
    case "block-ordered": return "format_list_numbered";
    case "block-task": return "checklist";
    case "block-quote": return "format_quote";
    case "block-code": return "code";
    case "block-hr": return "horizontal_rule";
    case "block-table": return "table_chart";
    case "block-definition-list": return "list";
    case "block-toc": return "toc";
    case "block-footnote": return "sticky_note_2";
    case "block-image": return "image";
    case "block-link": return "link";
    case "emoji-panel": return "mood";
    default: return null;
  }
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
    group: "Blocks",
    keywords: ["h1", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "block-h2",
    label: "Heading 2",
    hint: "##",
    group: "Blocks",
    keywords: ["h2", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "block-h3",
    label: "Heading 3",
    hint: "###",
    group: "Blocks",
    keywords: ["h3", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "block-h4",
    label: "Heading 4",
    hint: "####",
    group: "Blocks",
    keywords: ["h4", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: "block-h5",
    label: "Heading 5",
    hint: "#####",
    group: "Blocks",
    keywords: ["h5", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 5 }).run(),
  },
  {
    id: "block-h6",
    label: "Heading 6",
    hint: "######",
    group: "Blocks",
    keywords: ["h6", "heading"],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 6 }).run(),
  },
  {
    id: "block-bullet",
    label: "Bullet list",
    hint: "-",
    group: "Blocks",
    keywords: ["bullet", "list", "ul"],
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "block-ordered",
    label: "Numbered list",
    hint: "1.",
    group: "Blocks",
    keywords: ["numbered", "ordered", "ol"],
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "block-task",
    label: "Task list",
    hint: "[ ]",
    group: "Blocks",
    keywords: ["task", "todo", "checkbox"],
    run: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "block-quote",
    label: "Quote",
    hint: ">",
    group: "Blocks",
    keywords: ["quote", "blockquote"],
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "block-code",
    label: "Code block",
    hint: "```",
    group: "Blocks",
    keywords: ["codeblock", "fence"],
    run: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "block-hr",
    label: "Divider",
    hint: "---",
    group: "Blocks",
    keywords: ["hr", "divider", "rule"],
    run: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "block-table",
    label: "Table",
    hint: "3×3",
    group: "Insert",
    keywords: ["table", "grid"],
    run: (e: Editor) => insertDefaultTable(e),
  },
  {
    id: "block-definition-list",
    label: "Definition list",
    hint: "dl",
    group: "Insert",
    keywords: ["definition", "deflist", "dl", "term"],
    run: (e: Editor) => insertDefinitionList(e),
  },
  {
    id: "block-toc",
    label: "Table of contents",
    hint: "TOC",
    group: "Insert",
    keywords: ["toc", "contents", "outline"],
    run: (e: Editor) => insertTableOfContents(e),
  },
  {
    id: "block-image",
    label: "Image",
    hint: "img",
    group: "Insert",
    keywords: ["image", "img", "picture"],
    run: () => {
      useEditorStore.getState().setImageDialogOpen(true);
    },
  },
  {
    id: "block-link",
    label: "Link",
    hint: "url",
    group: "Insert",
    keywords: ["link", "url", "href"],
    run: () => {
      useEditorStore.getState().setLinkDialogOpen(true);
    },
  },
  {
    id: "block-footnote",
    label: "Footnote",
    hint: "[^1]",
    group: "Insert",
    keywords: ["footnote", "note", "ref"],
    run: (e: Editor) => {
      let nextId = 1;
      const footnoteType = e.schema.marks.footnote;
      if (footnoteType) {
        const ids = new Set<number>();
        e.state.doc.descendants((node) => {
          node.marks.forEach((mark) => {
            if (mark.type === footnoteType && mark.attrs.id) {
              const num = parseInt(mark.attrs.id, 10);
              if (!isNaN(num)) {
                ids.add(num);
              }
            }
          });
        });
        while (ids.has(nextId)) {
          nextId++;
        }
      }
      const idStr = String(nextId);
      e.chain().focus().insertContent(idStr).toggleMark("footnote", { id: idStr }).run();
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
      return [];
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
      const key = `mark-${entry.id}`;
      const icon = getSlashIcon(key);
      menuItems.push({
        key,
        section: index === 0 ? "Formatting" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span className="slash-menu__item-left">
              {icon && (
                <span className="material-symbols-outlined slash-menu__item-icon">
                  {icon}
                </span>
              )}
              <span className="slash-menu__label">{entry.label}</span>
            </span>
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

    // Group blocks by block vs insert
    const blockGroup: typeof blocks = [];
    const insertGroup: typeof blocks = [];
    blocks.forEach((item) => {
      if (item.entry.group === "Insert") {
        insertGroup.push(item);
      } else {
        blockGroup.push(item);
      }
    });

    blockGroup.forEach(({ entry }, index) => {
      const key = entry.id;
      const icon = getSlashIcon(key);
      menuItems.push({
        key,
        section: index === 0 ? "Blocks" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span className="slash-menu__item-left">
              {icon && (
                <span className="material-symbols-outlined slash-menu__item-icon">
                  {icon}
                </span>
              )}
              <span className="slash-menu__label">{entry.label}</span>
            </span>
            <span className="slash-menu__hint">{entry.hint}</span>
          </>
        ),
        run: () => {
          removeSlashTrigger(editor);
          entry.run(editor);
        },
      });
    });

    insertGroup.forEach(({ entry }, index) => {
      const key = entry.id;
      const icon = getSlashIcon(key);
      menuItems.push({
        key,
        section: index === 0 ? "Insert" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span className="slash-menu__item-left">
              {icon && (
                <span className="material-symbols-outlined slash-menu__item-icon">
                  {icon}
                </span>
              )}
              <span className="slash-menu__label">{entry.label}</span>
            </span>
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
      const key = "emoji-panel";
      const icon = getSlashIcon(key);
      menuItems.push({
        key,
        section: insertGroup.length === 0 ? "Insert" : undefined,
        className: "slash-menu__item",
        content: (
          <>
            <span className="slash-menu__item-left">
              {icon && (
                <span className="material-symbols-outlined slash-menu__item-icon">
                  {icon}
                </span>
              )}
              <span className="slash-menu__label">Emoji</span>
            </span>
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
    if (!menuOpen || items.length === 0 || emojiMode) {
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

  const hasItems = emojiMode || items.length > 0;
  if (!menuOpen || !hasItems) {
    return null;
  }

  return createPortal(
    <div
      className={`slash-menu ${emojiMode ? "is-emoji" : ""}`}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 40,
      }}
    >
      {emojiMode ? (
        <EmojiPicker
          onSelectEmoji={(emoji) => insertEmoji(editor, emoji)}
          onClose={() => setShowEmojiPanel(false)}
          initialSearch={
            filterQuery.toLowerCase().startsWith("emoji")
              ? filterQuery.slice(5).trim()
              : ""
          }
        />
      ) : (
        <div ref={menuRef}>
          {items.map((item, index) => (
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
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
