# MD

Lightweight WYSIWYG Markdown desktop editor for Windows (Tauri 2 + React + TipTap).

## Development

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

See [docs/release.md](docs/release.md) for installer modes, portable distribution, manual updates, and smoke-test checklist.

## Phase 1 scaffold

- Tauri shell with file open/save dialogs
- Tabbed documents with session restore
- TipTap WYSIWYG editor with Markdown round-trip
- Hidden raw Markdown pane (`Ctrl+/`)
- Zoom shortcuts (`Ctrl+±`, `Ctrl+wheel`)
- Mark registry + toolbar/menu shells for Phase 2

## Phase 4 (complete)

- External links: subtle superscript ↗ indicator on `http(s)` links (CSS-only, no serialization impact)
- Undo/redo: full history stack with redo (`Ctrl+Y` / `Ctrl+Shift+Z`) plus Edit menu entries; raw pane textarea keeps its native undo
- Reference definitions: completed definitions hidden in WYSIWYG, serialized at document end, editable via **Edit references** panel (View menu)
- Footnotes: `[^id]` references and multiline `[^id]:` definitions round-trip; definitions stay visible in WYSIWYG (jump-to-definition deferred)
- Print: in-window `window.print()` with dedicated `@media print` styles (Tauri WebView-safe); File menu and `Ctrl+P`

## Phase 5 (complete)

- **Settings** (`Ctrl+,` / File → Settings): all `AppConfig` fields; changes apply immediately
- **Find/replace**: `Ctrl+F` / `Ctrl+H`
- **Recent files**: File → Open Recent (last 10 paths)
- **Updates**: Help → Check for Updates (manual path + releases link); startup check logs when enabled
- **Release docs**: [docs/release.md](docs/release.md) — build, portable mode, NSIS, smoke tests
- **Deferred**: code signing, `tauri-plugin-updater` + release endpoint

## Phase 6 (mostly complete)

- Slash menu: Table (3×3 + header), Image (URL + alt dialog), Definition list, and Link inserts; smarter filter ranking (`img` → Image before Italic)
- Line-start triggers: `| ` inserts table; `![alt](url)` inserts image; `: ` after a term line builds definition list
- Selection toolbar: highlight color swatches + remove, inline link add/edit/remove, remove formatting, H1–H3 heading popover, bullet/ordered/task lists, blockquote
- Superscript `^` delimiter (with footnote guard); subscript `~` delimiter (guarded against `~~` strikethrough)

Out of scope for now: image drag-drop, escaping, raw HTML blocks, indent hacks.

## Storage

- Installed: `%APPDATA%\MD\`
- Portable: create `{exe_dir}\MD\portable.flag`
