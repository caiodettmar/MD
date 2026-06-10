import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Editor } from "@tiptap/react";
import {
  DEFAULT_CONFIG,
  fileNameFromPath,
  untitledName,
  type AppConfig,
  type SaveStatus,
  type TabDocument,
} from "../types";
import {
  loadConfig,
  loadSession,
  pickOpenMarkdownPath,
  pickSaveMarkdownPath,
  readMarkdownFile,
  saveConfig,
  saveSession,
  writeMarkdownFile,
} from "../lib/tauri";

const MAX_RECENT_FILES = 10;

interface EditorStore {
  initialized: boolean;
  config: AppConfig;
  tabs: TabDocument[];
  activeTabId: string | null;
  showRawPane: boolean;
  showReferencesPanel: boolean;
  settingsOpen: boolean;
  updateCheckOpen: boolean;
  imageDialogOpen: boolean;
  findBarOpen: boolean;
  findBarReplaceMode: boolean;
  editors: Record<string, Editor | null>;
  init: () => Promise<void>;
  updateConfig: (partial: Partial<AppConfig>) => void;
  resetConfig: () => void;
  setSettingsOpen: (open: boolean) => void;
  setUpdateCheckOpen: (open: boolean) => void;
  setImageDialogOpen: (open: boolean) => void;
  openFindBar: (replaceMode: boolean) => void;
  closeFindBar: () => void;
  addRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
  openFileByPath: (path: string) => Promise<void>;
  setEditor: (tabId: string, editor: Editor | null) => void;
  getActiveEditor: () => Editor | null;
  createTab: (partial?: Partial<TabDocument>) => string;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  updateTabMarkdown: (tabId: string, markdown: string) => void;
  toggleRawPane: () => void;
  toggleReferencesPanel: () => void;
  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  resetZoom: () => void;
  openFileDialog: () => Promise<void>;
  saveActiveTab: () => Promise<boolean>;
  saveActiveTabAs: () => Promise<boolean>;
  cycleTab: (direction: "next" | "prev") => void;
  printActiveTab: () => void;
  persistSession: () => Promise<void>;
  persistConfig: () => Promise<void>;
}

function createBlankTab(existing: TabDocument[]): TabDocument {
  const title = untitledName(existing);
  return {
    id: uuidv4(),
    path: null,
    title,
    markdown: "",
    dirty: false,
    saveStatus: "saved",
    lastSavedAt: null,
  };
}

function markDirty(tab: TabDocument, markdown: string): TabDocument {
  return {
    ...tab,
    markdown,
    dirty: true,
    saveStatus: "dirty",
  };
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  initialized: false,
  config: DEFAULT_CONFIG,
  tabs: [],
  activeTabId: null,
  showRawPane: false,
  showReferencesPanel: false,
  settingsOpen: false,
  updateCheckOpen: false,
  imageDialogOpen: false,
  findBarOpen: false,
  findBarReplaceMode: false,
  editors: {},

  init: async () => {
    if (get().initialized) {
      return;
    }

    const bootstrapTab = createBlankTab([]);
    set({
      initialized: true,
      config: DEFAULT_CONFIG,
      tabs: [bootstrapTab],
      activeTabId: bootstrapTab.id,
      showRawPane: false,
    });

    if (!isTauriRuntime()) {
      return;
    }

    try {
      const config = await withTimeout(loadConfig(), 5000, DEFAULT_CONFIG);
      let tabs: TabDocument[] = [];
      let activeTabId: string | null = null;

      if (config.restoreSession) {
        const session = await withTimeout(loadSession(), 5000, null);
        if (session && session.tabs.length > 0) {
          tabs = session.tabs.map((tab) => ({
            ...tab,
            saveStatus: tab.dirty ? "dirty" : "saved",
            lastSavedAt: null,
          }));
          activeTabId = session.activeTabId ?? tabs[0]?.id ?? null;
        }
      }

      if (tabs.length === 0) {
        const tab = createBlankTab([]);
        tabs = [tab];
        activeTabId = tab.id;
      }

      set({
        config,
        tabs,
        activeTabId,
        showRawPane: config.showRawOnStartup,
      });
      if (config.checkUpdates) {
        // Startup update check stub: no network calls until a release
        // endpoint exists (see docs/implementation-plan.md, Phase 5).
        console.info("MD update check skipped (no release endpoint configured).");
      }
    } catch (error) {
      console.error("Failed to initialize MD:", error);
    }
  },

  updateConfig: (partial) => {
    set((state) => ({
      config: {
        ...state.config,
        ...partial,
      },
    }));
    void get().persistConfig();
  },

  resetConfig: () => {
    set((state) => ({
      config: {
        ...DEFAULT_CONFIG,
        recentFiles: state.config.recentFiles,
      },
    }));
    void get().persistConfig();
  },

  setSettingsOpen: (open) => {
    set({ settingsOpen: open });
  },

  setUpdateCheckOpen: (open) => {
    set({ updateCheckOpen: open });
  },

  setImageDialogOpen: (open) => {
    set({ imageDialogOpen: open });
  },

  openFindBar: (replaceMode) => {
    set({ findBarOpen: true, findBarReplaceMode: replaceMode });
  },

  closeFindBar: () => {
    set({ findBarOpen: false });
  },

  addRecentFile: (path) => {
    set((state) => {
      const next = [
        path,
        ...state.config.recentFiles.filter((entry) => entry !== path),
      ].slice(0, MAX_RECENT_FILES);
      return {
        config: {
          ...state.config,
          recentFiles: next,
        },
      };
    });
    void get().persistConfig();
  },

  clearRecentFiles: () => {
    set((state) => ({
      config: {
        ...state.config,
        recentFiles: [],
      },
    }));
    void get().persistConfig();
  },

  openFileByPath: async (path) => {
    try {
      const file = await readMarkdownFile(path);
      const existing = get().tabs.find((tab) => tab.path === file.path);
      if (existing) {
        set({ activeTabId: existing.id });
        get().addRecentFile(file.path);
        return;
      }

      const tab: TabDocument = {
        id: uuidv4(),
        path: file.path,
        title: fileNameFromPath(file.path),
        markdown: file.content,
        dirty: false,
        saveStatus: "saved",
        lastSavedAt: new Date().toISOString(),
      };

      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
      get().addRecentFile(file.path);
    } catch (error) {
      console.error(`Failed to open ${path}:`, error);
      set((state) => ({
        config: {
          ...state.config,
          recentFiles: state.config.recentFiles.filter(
            (entry) => entry !== path,
          ),
        },
      }));
      void get().persistConfig();
    }
  },

  setEditor: (tabId, editor) => {
    set((state) => ({
      editors: {
        ...state.editors,
        [tabId]: editor,
      },
    }));
  },

  getActiveEditor: () => {
    const { activeTabId, editors } = get();
    if (!activeTabId) {
      return null;
    }
    return editors[activeTabId] ?? null;
  },

  createTab: (partial) => {
    const tab = {
      ...createBlankTab(get().tabs),
      ...partial,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));

    return tab.id;
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  closeTab: (tabId) => {
    set((state) => {
      if (state.tabs.length <= 1) {
        const replacement = createBlankTab([]);
        return {
          tabs: [replacement],
          activeTabId: replacement.id,
          editors: {},
        };
      }

      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      const tabs = state.tabs.filter((tab) => tab.id !== tabId);
      const nextEditors = { ...state.editors };
      delete nextEditors[tabId];

      let activeTabId = state.activeTabId;
      if (activeTabId === tabId) {
        const nextIndex = Math.max(0, index - 1);
        activeTabId = tabs[nextIndex]?.id ?? tabs[0]?.id ?? null;
      }

      return {
        tabs,
        activeTabId,
        editors: nextEditors,
      };
    });
  },

  updateTabMarkdown: (tabId, markdown) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? markDirty(tab, markdown) : tab,
      ),
    }));
  },

  toggleRawPane: () => {
    set((state) => ({ showRawPane: !state.showRawPane }));
  },

  toggleReferencesPanel: () => {
    set((state) => ({ showReferencesPanel: !state.showReferencesPanel }));
  },

  setZoom: (zoom) => {
    const clamped = Math.min(200, Math.max(50, zoom));
    set((state) => ({
      config: {
        ...state.config,
        editorZoom: clamped,
      },
    }));
    void get().persistConfig();
  },

  zoomBy: (delta) => {
    const next = get().config.editorZoom + delta;
    get().setZoom(next);
  },

  resetZoom: () => {
    get().setZoom(100);
  },

  openFileDialog: async () => {
    const path = await pickOpenMarkdownPath();
    if (!path) {
      return;
    }

    await get().openFileByPath(path);
  },

  saveActiveTab: async () => {
    const { activeTabId, tabs } = get();
    if (!activeTabId) {
      return false;
    }

    const tab = tabs.find((entry) => entry.id === activeTabId);
    if (!tab) {
      return false;
    }

    let path = tab.path;
    if (!path) {
      path = await pickSaveMarkdownPath(tab.title);
      if (!path) {
        return false;
      }
    }

    set((state) => ({
      tabs: state.tabs.map((entry) =>
        entry.id === tab.id
          ? { ...entry, saveStatus: "saving" as SaveStatus }
          : entry,
      ),
    }));

    try {
      const result = await writeMarkdownFile(path, tab.markdown);
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === tab.id
            ? {
                ...entry,
                path: result.path,
                title: fileNameFromPath(result.path),
                dirty: false,
                saveStatus: "saved" as SaveStatus,
                lastSavedAt: result.savedAt,
              }
              : entry,
        ),
      }));
      get().addRecentFile(result.path);
      await get().persistSession();
      return true;
    } catch {
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === tab.id
            ? { ...entry, saveStatus: "error" as SaveStatus }
            : entry,
        ),
      }));
      return false;
    }
  },

  saveActiveTabAs: async () => {
    const { activeTabId, tabs } = get();
    if (!activeTabId) {
      return false;
    }

    const tab = tabs.find((entry) => entry.id === activeTabId);
    if (!tab) {
      return false;
    }

    const path = await pickSaveMarkdownPath(tab.path ?? tab.title);
    if (!path) {
      return false;
    }

    try {
      const result = await writeMarkdownFile(path, tab.markdown);
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === tab.id
            ? {
                ...entry,
                path: result.path,
                title: fileNameFromPath(result.path),
                dirty: false,
                saveStatus: "saved",
                lastSavedAt: result.savedAt,
              }
            : entry,
        ),
      }));
      get().addRecentFile(result.path);
      await get().persistSession();
      return true;
    } catch {
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === tab.id ? { ...entry, saveStatus: "error" } : entry,
        ),
      }));
      return false;
    }
  },

  cycleTab: (direction) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1 || !activeTabId) {
      return;
    }

    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex < 0) {
      return;
    }

    const offset = direction === "next" ? 1 : -1;
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    set({ activeTabId: tabs[nextIndex]?.id ?? activeTabId });
  },

  printActiveTab: () => {
    // window.open("") does not return a usable window in the Tauri WebView
    // (and "noopener" guarantees a null reference), so we print the current
    // window instead. @media print rules in app.css hide all app chrome and
    // style the active editor surface for paper.
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    window.print();
  },

  persistSession: async () => {
    const { tabs, activeTabId } = get();
    await saveSession({
      tabs: tabs.map(({ id, path, title, markdown, dirty }) => ({
        id,
        path,
        title,
        markdown,
        dirty,
      })),
      activeTabId,
      savedAt: new Date().toISOString(),
    });
  },

  persistConfig: async () => {
    await saveConfig(get().config);
  },
}));
