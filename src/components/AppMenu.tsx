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
}

function MenuItemRow({ item, onClose }: MenuItemRowProps) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  if (item.separator) {
    return <div className="app-menu__separator" role="separator" />;
  }

  if (item.submenu && item.submenu.length > 0) {
    return (
      <div
        ref={anchorRef}
        className={`app-menu__submenu-anchor ${submenuOpen ? "is-open" : ""}`}
        onMouseEnter={() => {
          if (!item.disabled) {
            setSubmenuOpen(true);
          }
        }}
        onMouseLeave={() => setSubmenuOpen(false)}
      >
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={submenuOpen}
          className="app-menu__item app-menu__item--submenu"
          disabled={item.disabled}
        >
          <span>{item.label}</span>
          <span className="app-menu__submenu-caret" aria-hidden="true">
            ▸
          </span>
        </button>
        {submenuOpen ? (
          <div className="app-menu__flyout" role="menu">
            {item.submenu.map((child) => (
              <MenuItemRow key={child.id} item={child} onClose={onClose} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className="app-menu__item"
      disabled={item.disabled}
      title={item.title}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!item.disabled) {
          item.onSelect?.();
          onClose();
        }
      }}
    >
      <span>{item.label}</span>
      {item.shortcut ? (
        <span className="app-menu__shortcut">{item.shortcut}</span>
      ) : null}
    </button>
  );
}

export function AppMenu({ sections }: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <nav className="app-menu" aria-label="Application menu" ref={menuRef}>
      <button
        type="button"
        className={`app-menu__brand ${open ? "is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        MD
        <span className="app-menu__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="app-menu__dropdown" role="menu">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className="app-menu__group">
              {sectionIndex > 0 ? (
                <div className="app-menu__separator" role="separator" />
              ) : null}
              <div className="app-menu__group-label">{section.label}</div>
              {section.items.map((item) => (
                <MenuItemRow key={item.id} item={item} onClose={closeMenu} />
              ))}
            </div>
          ))}
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
