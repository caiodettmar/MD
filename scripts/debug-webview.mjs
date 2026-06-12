import { JSDOM, VirtualConsole } from "jsdom";

console.log("Initializing JSDOM debugging against http://localhost:1420/ ...");

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  console.error("JSDOM Error details:", error.message, error.stack);
});
virtualConsole.on("error", (...args) => {
  console.error("WEBVIEW ERROR:", ...args);
});
virtualConsole.on("log", (...args) => {
  console.log("WEBVIEW LOG:", ...args);
});
virtualConsole.on("warn", (...args) => {
  console.warn("WEBVIEW WARNING:", ...args);
});

try {
  const dom = await JSDOM.fromURL("http://localhost:1420/", {
    resources: "usable",
    runScripts: "dangerously",
    virtualConsole,
    beforeParse(window) {
      // Mock APIs needed for React, Tippy/TipTap, and Tauri
      window.matchMedia = window.matchMedia || (() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
      window.ResizeObserver = window.ResizeObserver || class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      // Mock Tauri IPC / commands
      window.__TAURI_INTERNALS__ = {
        ipc: {
          postMessage: () => {},
        },
        metadata: {
          version: "2.0.0",
        }
      };
    }
  });

  // Wait 6 seconds for bundle fetching and React rendering
  await new Promise((resolve) => setTimeout(resolve, 6000));
  console.log("Finished check. Closing DOM.");
  dom.window.close();
} catch (err) {
  console.error("Failed to load or execute webview:", err);
}
process.exit(0);
