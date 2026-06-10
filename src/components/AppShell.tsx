import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MdEditor } from "../editor/MdEditor";
import { useEditorStore } from "../stores/editorStore";
import { fileNameFromPath } from "../types";
import { AboutDialog } from "./AboutDialog";
import { exitApplication, type MenuItem, type MenuSection } from "./AppMenu";
import { EmptyState } from "./EmptyState";
import { FindReplaceBar } from "./FindReplaceBar";
import { ImageInsertDialog } from "./ImageInsertDialog";
import { LinkInsertDialog } from "./LinkInsertDialog";
import { RawPane } from "./RawPane";
import { ReferenceDefinitionsPanel } from "./ReferenceDefinitionsPanel";
import { SettingsDialog } from "./SettingsDialog";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { UpdateCheckDialog } from "./UpdateCheckDialog";

export function AppShell() {
  const initialized = useEditorStore((state) => state.initialized);
  const config = useEditorStore((state) => state.config);
  const tabs = useEditorStore((state) => state.tabs);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const showRawPane = useEditorStore((state) => state.showRawPane);
  const showReferencesPanel = useEditorStore((state) => state.showReferencesPanel);
  const activeEditor = useEditorStore((state) => {
    if (!state.activeTabId) {
      return null;
    }

    return state.editors[state.activeTabId] ?? null;
  });
  const init = useEditorStore((state) => state.init);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const closeTab = useEditorStore((state) => state.closeTab);
  const createTab = useEditorStore((state) => state.createTab);
  const updateTabMarkdown = useEditorStore((state) => state.updateTabMarkdown);
  const setEditor = useEditorStore((state) => state.setEditor);
  const openFileDialog = useEditorStore((state) => state.openFileDialog);
  const saveActiveTab = useEditorStore((state) => state.saveActiveTab);
  const saveActiveTabAs = useEditorStore((state) => state.saveActiveTabAs);
  const toggleRawPane = useEditorStore((state) => state.toggleRawPane);
  const toggleReferencesPanel = useEditorStore(
    (state) => state.toggleReferencesPanel,
  );
  const resetZoom = useEditorStore((state) => state.resetZoom);
  const getActiveEditor = useEditorStore((state) => state.getActiveEditor);
  const printActiveTab = useEditorStore((state) => state.printActiveTab);
  const persistSession = useEditorStore((state) => state.persistSession);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const setSettingsOpen = useEditorStore((state) => state.setSettingsOpen);
  const updateCheckOpen = useEditorStore((state) => state.updateCheckOpen);
  const setUpdateCheckOpen = useEditorStore((state) => state.setUpdateCheckOpen);
  const imageDialogOpen = useEditorStore((state) => state.imageDialogOpen);
  const imageEditPos = useEditorStore((state) => state.imageEditPos);
  const setImageDialogOpen = useEditorStore((state) => state.setImageDialogOpen);
  const clearImageEdit = useEditorStore((state) => state.clearImageEdit);
  const linkDialogOpen = useEditorStore((state) => state.linkDialogOpen);
  const setLinkDialogOpen = useEditorStore((state) => state.setLinkDialogOpen);
  const findBarOpen = useEditorStore((state) => state.findBarOpen);
  const openFindBar = useEditorStore((state) => state.openFindBar);
  const recentFiles = useEditorStore((state) => state.config.recentFiles);
  const openFileByPath = useEditorStore((state) => state.openFileByPath);
  const clearRecentFiles = useEditorStore((state) => state.clearRecentFiles);

  const [aboutOpen, setAboutOpen] = useState(false);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const handleEditorReady = useCallback(
    (tabId: string, editor: Editor | null) => {
      setEditor(tabId, editor);
    },
    [setEditor],
  );

  const recentFileItems: MenuItem[] = useMemo(() => {
    if (recentFiles.length === 0) {
      return [];
    }

    const items: MenuItem[] = recentFiles.map((path, index) => ({
      id: `recent-${index}`,
      label: `${index + 1}. ${fileNameFromPath(path)}`,
      onSelect: () => void openFileByPath(path),
    }));

    items.push({
      id: "recent-clear",
      label: "Clear Recent Files",
      onSelect: () => clearRecentFiles(),
    });
    items.push({
      id: "sep-recent",
      label: "",
      separator: true,
      onSelect: () => {},
    });

    return items;
  }, [clearRecentFiles, openFileByPath, recentFiles]);

  const menuSections: MenuSection[] = useMemo(
    () => [
      {
        id: "file",
        label: "File",
        items: [
          {
            id: "new",
            label: "New",
            shortcut: "Ctrl+T",
            onSelect: () => createTab(),
          },
          {
            id: "open",
            label: "Open…",
            shortcut: "Ctrl+O",
            onSelect: () => void openFileDialog(),
          },
          { id: "sep-1", label: "", separator: true, onSelect: () => {} },
          ...recentFileItems,
          {
            id: "save",
            label: "Save",
            shortcut: "Ctrl+S",
            onSelect: () => void saveActiveTab(),
          },
          {
            id: "save-as",
            label: "Save As…",
            shortcut: "Ctrl+Shift+S",
            onSelect: () => void saveActiveTabAs(),
          },
          { id: "sep-2", label: "", separator: true, onSelect: () => {} },
          {
            id: "print",
            label: "Print…",
            shortcut: "Ctrl+P",
            onSelect: () => printActiveTab(),
          },
          { id: "sep-3", label: "", separator: true, onSelect: () => {} },
          {
            id: "settings",
            label: "Settings…",
            shortcut: "Ctrl+,",
            onSelect: () => setSettingsOpen(true),
          },
          { id: "sep-4", label: "", separator: true, onSelect: () => {} },
          {
            id: "exit",
            label: "Exit",
            shortcut: "Alt+F4",
            onSelect: () => void exitApplication(),
          },
        ],
      },
      {
        id: "edit",
        label: "Edit",
        items: [
          {
            id: "undo",
            label: "Undo",
            shortcut: "Ctrl+Z",
            onSelect: () => {
              getActiveEditor()?.chain().focus().undo().run();
            },
          },
          {
            id: "redo",
            label: "Redo",
            shortcut: "Ctrl+Y",
            onSelect: () => {
              getActiveEditor()?.chain().focus().redo().run();
            },
          },
          { id: "sep-edit-1", label: "", separator: true, onSelect: () => {} },
          {
            id: "find",
            label: "Find",
            shortcut: "Ctrl+F",
            onSelect: () => openFindBar(false),
          },
          {
            id: "replace",
            label: "Replace",
            shortcut: "Ctrl+H",
            onSelect: () => openFindBar(true),
          },
        ],
      },
      {
        id: "view",
        label: "View",
        items: [
          {
            id: "raw",
            label: showRawPane ? "Hide Raw Markdown" : "Show Raw Markdown",
            shortcut: "Ctrl+/",
            onSelect: () => toggleRawPane(),
          },
          {
            id: "references",
            label: showReferencesPanel
              ? "Hide Reference Editor"
              : "Edit References",
            onSelect: () => toggleReferencesPanel(),
          },
          {
            id: "zoom-reset",
            label: "Reset Zoom",
            shortcut: "Ctrl+0",
            onSelect: () => resetZoom(),
          },
        ],
      },
      {
        id: "help",
        label: "Help",
        items: [
          {
            id: "check-updates",
            label: "Check for Updates…",
            onSelect: () => setUpdateCheckOpen(true),
          },
          {
            id: "about",
            label: "About MD",
            onSelect: () => setAboutOpen(true),
          },
        ],
      },
    ],
    [
      createTab,
      getActiveEditor,
      openFileDialog,
      openFindBar,
      printActiveTab,
      recentFileItems,
      resetZoom,
      saveActiveTab,
      saveActiveTabAs,
      setSettingsOpen,
      setUpdateCheckOpen,
      showRawPane,
      showReferencesPanel,
      toggleRawPane,
      toggleReferencesPanel,
    ],
  );

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const title = activeTab
      ? `${activeTab.dirty ? "* " : ""}${activeTab.title} — MD`
      : "MD";

    void getCurrentWindow().setTitle(title);
  }, [activeTab, initialized]);

  useEffect(() => {
    if (!initialized || !config.restoreSession) {
      return;
    }

    const timer = window.setInterval(() => {
      void persistSession();
    }, config.autoSaveMs);

    return () => window.clearInterval(timer);
  }, [config.autoSaveMs, config.restoreSession, initialized, persistSession]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const handleBeforeUnload = () => {
      void persistSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [initialized, persistSession]);

  if (!initialized) {
    return <div className="app-loading">Loading MD…</div>;
  }

  const showEmptyState =
    tabs.length === 1 &&
    activeTab !== null &&
    !activeTab.path &&
    activeTab.markdown.trim().length === 0;

  return (
    <div className="app-shell">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        menuSections={menuSections}
        onSelect={setActiveTab}
        onClose={closeTab}
        onNew={() => createTab()}
      />

      <main className="workspace">
        {showEmptyState ? (
          <EmptyState
            onOpen={() => void openFileDialog()}
            onNew={() => createTab()}
          />
        ) : null}

        <div
          className={`editor-stack ${showRawPane ? "has-raw-pane" : ""} ${
            showEmptyState ? "is-hidden" : ""
          }`}
        >
          {tabs.map((tab) => (
            <section
              key={tab.id}
              className={`editor-pane ${tab.id === activeTabId ? "is-active" : ""}`}
              aria-hidden={tab.id !== activeTabId}
            >
              {tab.id === activeTabId ? (
                <MdEditor
                  key={tab.id}
                  tabId={tab.id}
                  documentPath={tab.path}
                  markdown={tab.markdown}
                  editable
                  wordWrap={config.wordWrap}
                  fontSize={config.fontSize}
                  zoom={config.editorZoom}
                  isActive
                  onMarkdownChange={(markdown) =>
                    updateTabMarkdown(tab.id, markdown)
                  }
                  onEditorReady={handleEditorReady}
                />
              ) : null}
            </section>
          ))}

          {showRawPane && activeTab ? (
            <RawPane
              markdown={activeTab.markdown}
              onChange={(markdown) => updateTabMarkdown(activeTab.id, markdown)}
            />
          ) : null}
        </div>
      </main>

      <ReferenceDefinitionsPanel
        editor={activeEditor}
        open={showReferencesPanel}
        onToggle={toggleReferencesPanel}
      />

      {findBarOpen && activeEditor ? (
        <FindReplaceBar key={activeTabId ?? "none"} editor={activeEditor} />
      ) : null}

      <StatusBar tab={activeTab} config={config} showRawPane={showRawPane} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <UpdateCheckDialog
        open={updateCheckOpen}
        onClose={() => setUpdateCheckOpen(false)}
      />
      <ImageInsertDialog
        open={imageDialogOpen}
        editor={activeEditor}
        documentPath={activeTab?.path ?? null}
        editPos={imageEditPos}
        onClose={() => {
          clearImageEdit();
          setImageDialogOpen(false);
        }}
      />
      <LinkInsertDialog
        open={linkDialogOpen}
        editor={activeEditor}
        onClose={() => setLinkDialogOpen(false)}
      />
    </div>
  );
}
