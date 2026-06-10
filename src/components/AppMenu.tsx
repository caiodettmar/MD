import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  onSelect: () => void;
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

interface AppMenuProps {
  sections: MenuSection[];
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
              {section.items.map((item) =>
                item.separator ? (
                  <div
                    key={item.id}
                    className="app-menu__separator"
                    role="separator"
                  />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="app-menu__item"
                    disabled={item.disabled}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      item.onSelect();
                      setOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? (
                      <span className="app-menu__shortcut">{item.shortcut}</span>
                    ) : null}
                  </button>
                ),
              )}
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
