import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useEditorStore } from "./stores/editorStore";
import "./styles/theme.css";
import "./styles/app.css";

function ThemeSync() {
  const theme = useEditorStore((state) => state.config.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
  }, [theme]);

  return null;
}

function App() {
  useKeyboardShortcuts();

  return (
    <>
      <ThemeSync />
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </>
  );
}

export default App;
