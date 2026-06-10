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

## Storage

- Installed: `%APPDATA%\MD\`
- Portable: create `{exe_dir}\MD\portable.flag`
