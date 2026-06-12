import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  title?: string;
  onSelect?: () => void;
  submenu?: MenuItem[];
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

interface AppMenuProps {
  sections: MenuSection[];
}

interface MenuItemRowProps {
  item: MenuItem;
  onClose: () => void;
  onOpenSubmenu?: (item: MenuItem) => void;
}

function getMenuIcon(id: string): string | null {
  if (id.startsWith("recent-") && id !== "recent-clear" && id !== "recent-empty") {
    return "description";
  }
  switch (id) {
    case "new": return "note_add";
    case "open": return "file_open";
    case "open-recent": return "history";
    case "save": return "save";
    case "save-as": return "save_as";
    case "print": return "print";
    case "settings": return "settings";
    case "exit": return "logout";
    case "undo": return "undo";
    case "redo": return "redo";
    case "find": return "search";
    case "replace": return "find_replace";
    case "raw": return "code";
    case "references": return "link";
    case "zoom-reset": return "center_focus_strong";
    case "check-updates": return "update";
    case "about": return "info";
    case "recent-clear": return "delete";
    case "recent-empty": return "folder";
    default: return null;
  }
}

function MenuItemRow({ item, onClose, onOpenSubmenu }: MenuItemRowProps) {
  const hoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  if (item.separator) {
    return <div className="app-menu__separator" role="separator" />;
  }

  const iconName = getMenuIcon(item.id);

  const handleMouseEnter = () => {
    if (item.submenu && item.submenu.length > 0 && !item.disabled) {
      hoverTimerRef.current = window.setTimeout(() => {
        onOpenSubmenu?.(item);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  if (item.submenu && item.submenu.length > 0) {
    return (
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        className="app-menu__item app-menu__item--submenu"
        disabled={item.disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(event) => {
          event.stopPropagation();
          handleMouseLeave();
          if (!item.disabled) {
            onOpenSubmenu?.(item);
          }
        }}
      >
        <span className="app-menu__item-left">
          {iconName && (
            <span className="material-symbols-outlined app-menu__item-icon">
              {iconName}
            </span>
          )}
          <span>{item.label}</span>
        </span>
        <span className="app-menu__submenu-caret" aria-hidden="true">
          <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={`app-menu__item ${item.id === "exit" ? "app-menu__item--exit" : ""}`}
      disabled={item.disabled}
      title={item.title}
      onClick={(event) => {
        event.stopPropagation();
        if (!item.disabled) {
          item.onSelect?.();
          onClose();
        }
      }}
    >
      <span className="app-menu__item-left">
        {iconName && (
          <span className="material-symbols-outlined app-menu__item-icon">
            {iconName}
          </span>
        )}
        <span>{item.label}</span>
      </span>
      {item.shortcut ? (
        <span className="app-menu__shortcut">{item.shortcut}</span>
      ) : null}
    </button>
  );
}

export function AppMenu({ sections }: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<MenuItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setDrillDown(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (drillDown) {
          setDrillDown(null);
        } else {
          setOpen(false);
        }
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drillDown, open]);

  const closeMenu = () => setOpen(false);

  return (
    <nav className="app-menu" aria-label="Application menu" ref={menuRef}>
      <button
        type="button"
        className={`app-menu__brand ${open ? "is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        MD
      </button>
      {open ? (
        <div
          className="app-menu__dropdown"
          role="menu"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          {drillDown ? (
            <div className="app-menu__drilldown">
              <button
                type="button"
                className="app-menu__back"
                onClick={(event) => {
                  event.stopPropagation();
                  setDrillDown(null);
                }}
              >
                <span className="material-symbols-outlined app-menu__back-arrow" aria-hidden="true">
                  arrow_back
                </span>
                <span>{drillDown.label}</span>
              </button>
              <div className="app-menu__separator" role="separator" />
              {drillDown.submenu?.map((item) => (
                <MenuItemRow key={item.id} item={item} onClose={closeMenu} />
              ))}
            </div>
          ) : (
            <div className="app-menu__main-content">
              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="app-menu__group">
                  {sectionIndex > 0 ? (
                    <div className="app-menu__separator" role="separator" />
                  ) : null}
                  <div className="app-menu__group-label">{section.label}</div>
                  {section.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      onClose={closeMenu}
                      onOpenSubmenu={setDrillDown}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </nav>
  );
}

export async function exitApplication() {
  try {
    await invoke("exit_app");
  } catch {
    try {
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  }
}
