import { useState, useRef } from "react";
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
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  menuSections,
  onSelect,
  onClose,
  onNew,
  onReorder,
}: TabBarProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnter = (_e: React.DragEvent, index: number) => {
    if (draggedIndexRef.current === null || draggedIndexRef.current === index) {
      return;
    }
    onReorder(draggedIndexRef.current, index);
    draggedIndexRef.current = index;
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setDraggingIndex(null);
  };

  return (
    <header className="tab-bar">
      <AppMenu sections={menuSections} />
      <div className="tab-bar__tabs" role="tablist" aria-label="Open documents">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = index === draggingIndex;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab-bar__tab ${isActive ? "is-active" : ""} ${
                isDragging ? "is-dragging" : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
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
              </span>
              {tab.dirty && (
                <span className="tab-bar__dirty" aria-label="Unsaved changes" />
              )}
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
        <button
          type="button"
          className="tab-bar__new"
          aria-label="New tab"
          onClick={onNew}
        >
          +
        </button>
      </div>
    </header>
  );
}
