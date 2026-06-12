# 🚀 MD: High-Fidelity WYSIWYG Markdown Desktop Editor

> A distraction-free desktop Markdown editor built on Tauri, React, and TipTap, designed for writers and developers who demand seamless visual editing without losing the clean precision of raw Markdown. MD bridges the gap between rich WYSIWYG convenience and plain-text serialization, featuring real-time dual-pane synchronization and offline-first performance.

<!-- BADGE CONTAINER -->
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/caiodettmar/MD)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)](https://github.com/caiodettmar/MD)

---

## ✨ Primary Capabilities

- **Interactive Slash Menu (`/`):** Accelerate your document assembly by simply typing `/` to insert headings (H1-H6), bullet/numbered/task lists, code blocks, dividers, tables, footnotes, definition lists, and Table of Contents without leaving the keyboard.
- **WYSIWYG Inline Shortcuts:** Write with the speed of raw Markdown. The editor parses inline syntax (like `_italic_`, `**bold**`, `___underline___`, code blocks, lists, and tables) in real time, instantly transforming your text into formatted elements as you type.
- **Selection Bubble Menu:** Select any text block to trigger a context-sensitive formatting bar. Toggle formatting styles (bold, italic, strikethrough, underline, code, highlights, subscript, superscript), adjust text and highlight colors via custom swatches, convert block types, or configure links.
- **Real-Time Dual-Pane Sync:** Features a side-by-side rich text editor and raw Markdown pane (`Ctrl + /`) that synchronize immediately on keystroke without lag.
- **Hierarchical Table of Contents:** Generates a live and printable Table of Contents via `[toc]` or the Slash Menu, automatically compiling nested list numbers (e.g., `1.1`, `1.1.1`) up to H3.
- **Robust Session Recovery:** Keeps automatic document snapshots and saves open tabs so you can resume your exact writing state on next launch.

---

## 🛠️ Installation & Bootstrapping

Ensure your local development environment meets the necessary system prerequisites before compilation.

### Production Release Modes

You can run the compiled MD application in either standard installed mode or standalone portable mode:

- **Installed Mode:** Download the NSIS installer `.exe` from releases and run it. You can choose to install for the **current user** (requires no admin privileges, installs in `%LOCALAPPDATA%`) or **all users** (requires elevation, installs in `Program Files`). Running the installer registers file associations for `.md` and `.markdown` files.
- **Portable Mode:** Copy the release executable to your folder of choice (e.g. `D:\MD-Portable\`), create an empty file named `MD\portable.flag` next to the executable, and run the app. This forces MD to write all user settings (`config.json`) and tab snapshot histories (`session/`) directly inside the local folder instead of `%APPDATA%\MD\`.

### Local Development Prerequisites
- Node.js runtime (`v18.0.0` or higher)
- Rust toolchain (`stable` channel) for Tauri native builds
- Active package registry configuration (`npm`)

### Local Execution Sequence
Follow these terminal steps to build and run the development application shell locally:

```bash
# 1. Clone the repository manifest from the origin source
git clone https://github.com/caiodettmar/MD.git

# 2. Re-route your active shell context to the project root directory
cd MD

# 3. Provision local node_modules via the explicit lockfile configuration
npm ci

# 4. Start the hot-reloading development server profile (frontend + tauri wrapper)
npm run tauri:dev
```

To build a production bundle installer:
```bash
# Compile client assets and build native Windows installers
npm run tauri:build
```

---

## 🎹 Navigation & System Keybindings

### Markdown Inline Triggers (Auto-Formatting)

Typing the following Markdown syntax in the editor will instantly apply the style or insert the element:

| Element / Style | Markdown Delimiter / Input Rule | Effect |
| :--- | :--- | :--- |
| **Italic** | `_italic_` or `_ ` + `Space` | Toggles italic text |
| **Bold** | `**bold**` or `__bold__` | Toggles bold text |
| **Underline** | `___underline___` | Toggles underlined text |
| **Strikethrough** | `~~strikethrough~~` | Toggles strikethrough text |
| **Highlight** | `==highlight==` | Toggles background highlight color |
| **Inline Code** | `` `code` `` | Toggles monospaced code formatting |
| **Subscript** | `~subscript~` | Toggles subscript style |
| **Superscript** | `^superscript^` | Toggles superscript style |
| **Headings 1 - 6** | `# ` to `###### ` at start of line | Creates header blocks (H1 to H6) |
| **Bullet List** | `- ` or `* ` at start of line | Spawns a bulleted list |
| **Numbered List** | `1. ` at start of line | Spawns an ordered list |
| **Task List** | `[ ] ` or `[x] ` at start of line | Spawns a checklist item |
| **Blockquote** | `> ` at start of line | Creates a blockquote |
| **Divider** | `---` or `***` on a new line | Spawns a horizontal rule |
| **Table Spawning** | `\|*N ` (e.g. `\|*3 ` + `Space`) | Instantly inserts a headered `N` x `N` table |
| **Definition List** | `: ` after a term line | Builds definition terms and descriptions |
| **Footnote Ref** | `[^1]` | Inserts a footnote anchor definition |
| **Emoji Shortcode** | `:shortcode:` (e.g. `:smile:`) | Converts shortcode to emoji character |

### Global Application Shortcuts

| Action Task | macOS Keybinding | Windows / Linux | Global State |
| :--- | :--- | :--- | :--- |
| **New Tab** | `Cmd + T` | `Ctrl + T` | Application-wide |
| **Close Current Tab** | `Cmd + W` | `Ctrl + W` | Application-wide |
| **Cycle Tabs (Next)** | `Cmd + Tab` | `Ctrl + Tab` | Application-wide |
| **Cycle Tabs (Prev)** | `Cmd + Shift + Tab` | `Ctrl + Shift + Tab` | Application-wide |
| **Open File** | `Cmd + O` | `Ctrl + O` | Application-wide |
| **Save File** | `Cmd + S` | `Ctrl + S` | Application-wide |
| **Save File As** | `Cmd + Shift + S` | `Ctrl + Shift + S` | Application-wide |
| **Print Document** | `Cmd + P` | `Ctrl + P` | Application-wide |
| **Find Text** | `Cmd + F` | `Ctrl + F` | Application-wide |
| **Find & Replace Text** | `Cmd + H` | `Ctrl + H` | Application-wide |
| **Toggle Split Pane** | `Cmd + /` | `Ctrl + /` | Application-wide |
| **Zoom In UI** | `Cmd + +` / `Cmd + Scroll Up` | `Ctrl + +` / `Ctrl + Scroll Up` | Application-wide |
| **Zoom Out UI** | `Cmd + -` / `Cmd + Scroll Down` | `Ctrl + -` / `Ctrl + Scroll Down` | Application-wide |
| **Reset UI Zoom** | `Cmd + 0` | `Ctrl + 0` | Application-wide |
| **Open Settings** | `Cmd + ,` | `Ctrl + ,` | Application-wide |

### Editor Formatting Shortcuts

| Action Task | macOS Keybinding | Windows / Linux | Global State |
| :--- | :--- | :--- | :--- |
| **Toggle Bold** | `Cmd + B` | `Ctrl + B` | Active Editor |
| **Toggle Italic** | `Cmd + I` | `Ctrl + I` | Active Editor |
| **Toggle Underline** | `Cmd + U` | `Ctrl + U` | Active Editor |
| **Toggle Strikethrough** | `Cmd + Shift + X` | `Ctrl + Shift + X` | Active Editor |
| **Inline Code** | `Cmd + E` | `Ctrl + E` | Active Editor |
| **Heading 1** | `Cmd + Alt + 1` | `Ctrl + Alt + 1` | Active Editor |
| **Heading 2** | `Cmd + Alt + 2` | `Ctrl + Alt + 2` | Active Editor |
| **Heading 3** | `Cmd + Alt + 3` | `Ctrl + Alt + 3` | Active Editor |
| **Heading 4** | `Cmd + Alt + 4` | `Ctrl + Alt + 4` | Active Editor |
| **Heading 5** | `Cmd + Alt + 5` | `Ctrl + Alt + 5` | Active Editor |
| **Heading 6** | `Cmd + Alt + 6` | `Ctrl + Alt + 6` | Active Editor |
| **Bullet List** | `Cmd + Shift + 8` | `Ctrl + Shift + 8` | Active Editor |
| **Numbered List** | `Cmd + Shift + 7` | `Ctrl + Shift + 7` | Active Editor |
| **Task List** | `Cmd + Shift + 9` | `Ctrl + Shift + 9` | Active Editor |
| **Blockquote** | `Cmd + Shift + B` | `Ctrl + Shift + B` | Active Editor |
| **Code Block** | `Cmd + Alt + C` | `Ctrl + Alt + C` | Active Editor |
| **Hard Break** | `Shift + Enter` | `Shift + Enter` | Active Editor |
| **Undo** | `Cmd + Z` | `Ctrl + Z` | Active Editor |
| **Redo** | `Cmd + Y` or `Cmd + Shift + Z` | `Ctrl + Y` or `Ctrl + Shift + Z` | Active Editor |

---

## ⚙️ Core Technical Specifications

The application state is controlled by a local configuration file containing the `AppConfig` registry. These values are applied dynamically at runtime:

| Parameter / Configuration | Type | Default Value | Architectural Function |
| :--- | :--- | :--- | :--- |
| `restoreSession` | `Boolean` | `true` | Restores the previously opened tabs and active workspace files on startup. |
| `theme` | `String` | `"system"` | Dictates the interface theme styling mode: `"system"`, `"light"`, or `"dark"`. |
| `fontSize` | `Number` | `100` | Specifies the base editor typography size percentage. |
| `wordWrap` | `Boolean` | `true` | Constrains paragraph line wrapping within the active editor viewport bounds. |
| `editorZoom` | `Number` | `100` | Controls the global webview interface zoom and layout scaling level. |
| `emojiSaveMode` | `String` | `"unicode"` | Dictates if emojis serialize as raw unicode (`😄`) or markdown shortcodes (`:smile:`). |
| `showRawOnStartup` | `Boolean` | `false` | Instructs the workspace to show the raw Markdown pane side-by-side immediately on boot. |
| `autoSaveMs` | `Number` | `2000` | The background execution delay in milliseconds before autosaving dirty tabs. |
| `checkUpdates` | `Boolean` | `true` | Toggles the automated GitHub Releases checking check on application start. |
| `showEditReferences` | `Boolean` | `true` | Displays the sidebar panel dedicated to editing link reference definitions. |
| `useMaxWidth` | `Boolean` | `true` | Constrains editor page content width to improve text readability. |
| `maxWidthPreset` | `String` | `"Default"` | Selects predefined layout width boundaries. |
| `maxWidthCustomValue` | `Number` | `720` | Specifies width constraint value when using custom sizes. |
| `maxWidthCustomUnit` | `String` | `"px"` | Unit format of the custom width boundary (e.g. `px`). |

---

## 🤝 Code Contributions

We welcome open-source contributions. Follow this checklist to ensure standard integration:

1. **Fork** the project architecture to your personal GitHub workspace.
2. Branch your repository cleanly using descriptive tokens (`git checkout -b feature/AmazingFeature`).
3. Commit structural modifications following conventional commit messaging guidelines (`git commit -m 'feat: add explicit pipeline caching'`).
4. Push structural tracking updates directly to your upstream branch (`git push origin feature/AmazingFeature`).
5. Open a formal **Pull Request** detailing changes against the main branch.

---

## 📄 Licensing Information

This platform is licensed under the terms of the MIT open-source license agreements. Review the localized `LICENSE` manifest for absolute legal disclosures and text distributions.
