import type { MenuSection } from "./AppMenu";
import { AppMenu } from "./AppMenu";
import type { TabDocument } from "../types";

interface TabBarProps {
  tabs: TabDocument[];
  activeTabId: string | null;
  menuSections: MenuSection[];
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onNew: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  menuSections,
  onSelect,
  onClose,
  onNew,
}: TabBarProps) {
  return (
    <header className="tab-bar">
      <AppMenu sections={menuSections} />
      <div className="tab-bar__tabs" role="tablist" aria-label="Open documents">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const dirtyMarker = tab.dirty ? " •" : "";

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab-bar__tab ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect(tab.id)}
              onMouseDown={(event) => {
                if (event.button === 1) {
                  event.preventDefault();
                  onClose(tab.id);
                }
              }}
            >
              <span className="tab-bar__title">
                {tab.title}
                {dirtyMarker}
              </span>
              <span
                className="tab-bar__close"
                role="button"
                aria-label={`Close ${tab.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="tab-bar__new"
        aria-label="New tab"
        onClick={onNew}
      >
        +
      </button>
    </header>
  );
}
