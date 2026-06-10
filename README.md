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

## Phase 4 backlog

- External links: superscript external indicator (e.g. 🔗)
- Undo/redo: full history stack with redo (`Ctrl+Y` / `Ctrl+Shift+Z`), not just single-step undo
- Reference definitions: completed definitions hidden in WYSIWYG, serialized at document end, editable via **Edit references** panel (View menu)

## Storage

- Installed: `%APPDATA%\MD\`
- Portable: create `{exe_dir}\MD\portable.flag`
