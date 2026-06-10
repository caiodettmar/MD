import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";

export function useKeyboardShortcuts() {
  const openFileDialog = useEditorStore((state) => state.openFileDialog);
  const saveActiveTab = useEditorStore((state) => state.saveActiveTab);
  const saveActiveTabAs = useEditorStore((state) => state.saveActiveTabAs);
  const createTab = useEditorStore((state) => state.createTab);
  const closeTab = useEditorStore((state) => state.closeTab);
  const cycleTab = useEditorStore((state) => state.cycleTab);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const toggleRawPane = useEditorStore((state) => state.toggleRawPane);
  const zoomBy = useEditorStore((state) => state.zoomBy);
  const resetZoom = useEditorStore((state) => state.resetZoom);
  const printActiveTab = useEditorStore((state) => state.printActiveTab);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) {
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        cycleTab(event.shiftKey ? "prev" : "next");
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "o") {
        event.preventDefault();
        void openFileDialog();
        return;
      }

      if (key === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          void saveActiveTabAs();
        } else {
          void saveActiveTab();
        }
        return;
      }

      if (key === "t") {
        event.preventDefault();
        createTab();
        return;
      }

      if (key === "w" && activeTabId) {
        event.preventDefault();
        closeTab(activeTabId);
        return;
      }

      if (key === "p") {
        event.preventDefault();
        printActiveTab();
        return;
      }

      if (key === "/" || (key === "7" && event.shiftKey)) {
        event.preventDefault();
        toggleRawPane();
        return;
      }

      if (key === "=" || key === "+") {
        event.preventDefault();
        zoomBy(10);
        return;
      }

      if (key === "-") {
        event.preventDefault();
        zoomBy(-10);
        return;
      }

      if (key === "0") {
        event.preventDefault();
        resetZoom();
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 10 : -10);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("wheel", onWheel);
    };
  }, [
    activeTabId,
    closeTab,
    createTab,
    cycleTab,
    openFileDialog,
    printActiveTab,
    resetZoom,
    saveActiveTab,
    saveActiveTabAs,
    toggleRawPane,
    zoomBy,
  ]);
}
