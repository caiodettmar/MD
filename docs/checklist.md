# MD — Implementation Checklist

Track what is **done**, **partial**, or **not started**. Last updated to match the codebase at v0.1.0 (Phase 5/6 in progress).

Legend: ✅ Done · 🟡 Partial · ⬜ Not started

---

## Application shell

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Tauri 2 desktop window | `src-tauri/` |
| ✅ | Open / Save / Save As | Rust commands + dialogs; `Ctrl+O/S/Shift+S` |
| ✅ | Tabbed documents | New, close, switch, middle-click close |
| ✅ | `Ctrl+Tab` / `Ctrl+Shift+Tab` | Tab cycling |
| ✅ | Session restore (including unsaved) | Default on; `config.restoreSession` |
| ✅ | Periodic session auto-save | `config.autoSaveMs` (default 2s) |
| ✅ | Config load/save (backend) | `config.json` via Tauri |
| ✅ | Settings / Preferences UI | `SettingsDialog.tsx`; File menu + `Ctrl+,`; applies immediately, Reset to defaults |
| ✅ | Portable mode detection | `MD/portable.flag` next to executable |
| ✅ | Installed storage path | `%APPDATA%\MD\` |
| ✅ | `.md` file association | `tauri.conf.json` bundle |
| 🟡 | Production installer | NSIS config present; not fully QA'd |
| ✅ | About dialog | Version 0.1.0 |
| ✅ | Exit application | Menu + Tauri `exit_app` |
| ✅ | Window title reflects dirty state | `AppShell.tsx` |
| ✅ | Recent files list | Last 10 paths in `config.recentFiles` (TS + Rust); File > Open Recent + Clear |
| ⬜ | macOS / Linux builds | Windows-first v1 |

---

## Editor chrome & navigation

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Hidden raw Markdown pane | `Ctrl+/`; toggle in View menu |
| ✅ | Show raw on startup option | `config.showRawOnStartup` wired at init |
| ✅ | Zoom in/out/reset | `Ctrl+±`, `Ctrl+0`, `Ctrl+wheel` |
| ✅ | Font size scaling | `config.fontSize` applied in editor shell |
| ✅ | Word wrap | `config.wordWrap`; shown in status bar |
| ✅ | Toggle wrap from UI | Settings dialog checkbox |
| ✅ | Status bar | Path, UTF-8, save state, wrap, zoom |
| ✅ | System / light / dark theme | `config.theme` → `data-theme` |
| ✅ | Theme picker in UI | Settings dialog select (system/light/dark) |
| ✅ | Placeholder hint | "Start writing, or press / for commands…" |
| ✅ | Print | `Ctrl+P`; hidden iframe with styled HTML (`printDocument.ts`); `@media print` fallback when no editor |
| ✅ | Find / replace | `Ctrl+F` / `Ctrl+H` find bar; decoration highlights, next/prev, match count, replace one/all |

---

## WYSIWYG — inline formatting

| Status | Item | Trigger | Notes |
|--------|------|---------|-------|
| ✅ | Bold | `**` | Delimiters hidden |
| ✅ | Italic | `*` | Delimiters hidden |
| ✅ | Strikethrough | `~~` | Delimiters hidden |
| ✅ | Highlight | `==` | Theme-aware colors |
| ✅ | Inline code | `` ` `` | Delimiters hidden |
| ✅ | Underline | Slash / toolbar | No delimiter rule |
| ✅ | Text color | Selection toolbar | Serializes as `<span style="color: …">` |
| ✅ | Multi-color highlight | Selection toolbar swatches | Colored highlight serializes as `<mark style>` via `MarkdownHighlight`; default stays `==…==` |
| ✅ | Emoji shortcode | `:name:` | gemoji lookup |
| 🟡 | Emoji save mode | `config.emojiSaveMode` | Config stored; serialization not differentiated |
| ✅ | Subscript typing | `~` (before-char guard) / slash / toolbar | Raw pane serializes as `<sub>…</sub>`; single `~` skips when preceded by `~` so `~~` stays strikethrough |
| ✅ | Superscript typing | `^` | Input rule with footnote (`[^`) guard; raw pane serializes as `<sup>…</sup>`; also slash menu / toolbar |

---

## WYSIWYG — blocks

| Status | Item | Trigger | Notes |
|--------|------|---------|-------|
| ✅ | Headings H1–H6 | `# ` … `###### ` at line start | `inlineBlockTriggers.ts` |
| ✅ | Bullet list | `- ` / `* ` at line start | |
| ✅ | Numbered list | `1. ` at line start | |
| ✅ | Task list | `- [ ]` / `- [x]` at line start | Layout fixed (flex row) |
| ✅ | Blockquote | `> ` at line start | |
| ✅ | Horizontal rule | `---` at line start | |
| ✅ | Fenced code block | Slash menu / TipTap | Shiki highlighting |
| ✅ | Fenced code + language | ` ```lang ` at line start | `inlineBlockTriggers.ts` |
| ✅ | Tables | `\| ` at line start / slash menu | 3×3 with header row; WYSIWYG borders + resizable columns; multiline cells serialize as `<br>` in raw pane |
| ✅ | Images | `![alt](url)` input rule / slash menu | URL/path dialog + local file picker (Tauri); relative paths via doc directory |
| ✅ | Raw HTML images | `<img>` / `<picture>` in raw pane | Parsed into image nodes; round-trip via markdown or HTML with `data-md-src` |
| ✅ | Definition lists | Slash menu / `: ` line-start | WYSIWYG `<dl>` styling; raw pane serializes as `<dl><dt><dd>` HTML |
| ✅ | Paragraphs | Default | |

---

## Slash menu (`/`)

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Opens at cursor | Fixed positioning (no off-screen / spurious newline) |
| ✅ | Filter as you type | Scored prefix/keyword matching (`slashMenuUtils.ts`) |
| ✅ | Keyboard navigation | ↑↓ Enter Esc |
| ✅ | Formatting section | From `markRegistry` |
| ✅ | Blocks section | Headings, lists, quote, code, HR |
| ✅ | Emoji submenu | Preset grid |
| ✅ | Table insert | 3x3 with header row |
| ✅ | Image insert | URL + alt dialog (`ImageInsertDialog.tsx`) |
| ✅ | Definition list insert | Slash menu "Definition list" |
| ✅ | Link insert | Opens `LinkInsertDialog` (selection or URL at cursor) |

---

## Selection toolbar

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Appears on text selection | Custom portal toolbar (not static bar) |
| ✅ | Bold / italic / strike / highlight / underline / code | Via `markRegistry` | SVG icons + tooltips |
| ✅ | Text color swatches | Drill-down row in selection toolbar | Back arrow + preset circles + custom color + reset |
| ✅ | Highlight color swatches | Drill-down row in selection toolbar | Back arrow + preset circles + custom color + clear |
| ✅ | Heading / list / quote actions | Headings drill-down (H1–H3), bullet/ordered/task, blockquote icons |
| ✅ | Remove formatting | A-with-strikethrough icon → `unsetAllMarks().clearNodes()` |
| ✅ | Selection toolbar overflow | Single-row drill-down toolbar; circular icon buttons |
| ✅ | Link edit / remove | Link + unlink icons → `LinkEditDialog` (add/update/remove, optional title) |

---

## Links & references

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Autolink URLs | `MarkdownLink` |
| ✅ | Paste URL → link | |
| ✅ | `[text](url)` input | |
| ✅ | `[text][ref]` reference links | Href synced from definitions |
| ✅ | Link reference definitions | Hidden in WYSIWYG; at document end |
| ✅ | `[id]:` + space → modal dialog | Name, URL, optional title |
| ✅ | Full-line `[id]: url "title"` silent insert | No modal |
| ✅ | Edit references panel | View menu; CRUD on completed defs |
| ✅ | External link click confirmation | Modal before open |
| ✅ | Open via Tauri opener plugin | Fallback `window.open` in dev |
| ✅ | External link visual indicator | CSS-only superscript ↗ on `http(s)` hrefs (`app.css`); internal/anchor links unaffected |
| ✅ | Inline link title editing | Via bubble menu link dialog |

---

## Footnotes

| Status | Item | Notes |
|--------|------|-------|
| ✅ | `[^id]` reference mark | Input rules (inline + line-start) |
| ✅ | `[^id]:` definition block | Multiline body support |
| ✅ | Footnote defs in WYSIWYG | Visible with label styling by design (defs are content, unlike hidden link refs); round-trip verified |
| ⬜ | Footnote preview / jump UI | Deferred — click-to-scroll considered, skipped as non-trivial plugin work |

---

## Markdown fidelity

| Status | Item | Notes |
|--------|------|-------|
| ✅ | GFM core via TipTap StarterKit + extensions | |
| ✅ | Markdown round-trip (editor ↔ string) | `@tiptap/markdown` |
| ✅ | Markdown paste (plain text) | `markdownPaste.ts` |
| ✅ | Colored text in raw pane | HTML span serialization |
| ✅ | Subscript / superscript in raw pane | `<sub>` / `<sup>` HTML serialization; round-trip via markdown HTML parse |
| 🟡 | Markdown Guide — basic syntax | Covered incl. images/links and raw `<img>` HTML fallback; escaping + raw HTML blocks out of scope |
| ✅ | Markdown Guide — extended syntax | Tables, tasks, strike, highlight, footnotes, sub/sup, definition lists |
| 🟡 | Markdown Guide — hacks | Underline, sub/sup done; indent tricks not planned |
| ⬜ | Emoji shortcode round-trip option | `emojiSaveMode: "shortcode"` not enforced |

---

## Code blocks

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Shiki syntax highlighting | GitHub light/dark |
| ✅ | Theme sync with app dark mode | MutationObserver on `data-theme` |
| ✅ | Readable text before highlight loads | Opacity / layering fixes applied |
| ✅ | Scroll sync overlay ↔ editable | |
| 🟡 | Language picker / auto-detect | Language attr from fence when present |

---

## Undo / redo

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Undo | TipTap history (StarterKit) handles `Ctrl+Z` in editor; Edit menu entry; global fallback when focus is outside editor |
| ✅ | Redo | `Ctrl+Y` and `Ctrl+Shift+Z` via TipTap keymap in editor + global fallback (`useKeyboardShortcuts`); Edit menu entry; raw pane/inputs keep native undo |
| ✅ | Full history polish | Shortcuts skip textarea/input targets; menu actions focus editor before undo/redo |

---

## Updates & distribution

| Status | Item | Notes |
|--------|------|-------|
| ✅ | `checkUpdates` config flag | Settings checkbox; startup check is a logging no-op stub |
| ⬜ | Tauri auto-updater plugin | Needs tauri-plugin-updater + signing keypair + release endpoint (release-engineering follow-up) |
| ✅ | Manual update check dialog | Help → Check for Updates…; View releases button (`UpdateCheckDialog.tsx`) |
| ⬜ | Code signing | — |

---

## Quality & testing

| Status | Item | Notes |
|--------|------|-------|
| ✅ | TypeScript strict build | `tsc && vite build` |
| ⬜ | Automated test suite | No unit/E2E tests in repo |
| ⬜ | Markdown round-trip fixture tests | — |
| ⬜ | Performance budget (large docs) | OOM issue fixed; no regression suite |

---

## Recent bugfixes (verified)

| Status | Item |
|--------|------|
| ✅ | OOM / freeze on `[id]:` typing (reorder loop) |
| ✅ | Line break on every keystroke in reference defs |
| ✅ | Cursor jump to document end after confirm |
| ✅ | Invisible cursor / invalid selection after reorder |
| ✅ | Slash menu off-screen / spurious newline on `/` |
| ✅ | Slash menu duplicates & lag |
| ✅ | Code block invisible text (Shiki overlay) |
| ✅ | Debug instrumentation removed |
| ✅ | Local image `./path` resolution (`\./` join bug) and toolbar single-row layout |

---

## Suggested next priorities

1. **Auto-updater** — tauri-plugin-updater + signing keypair + release endpoint; required for v1 release story.
2. **Automated round-trip tests** — Lock in reference-definition, footnote, and highlight serialization behavior.
3. **Installer QA** — Smoke-test NSIS per-user/per-machine modes and portable bundle.
4. **Definition lists & remaining Markdown Guide hacks** — Indent tricks remain lowest priority.

---

## Quick phase summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Shell, tabs, I/O, session, raw pane, zoom | ✅ Complete |
| 2 | Inline delimiters, slash menu, selection bar | ✅ Complete |
| 3 | Colors, emoji, Shiki, paste, polish | ✅ Complete |
| 4 | Links, refs, footnotes, print, stability | ✅ Complete (Settings UI & auto-update moved to Phase 5) |
| 5 | Settings, updates, release QA | 🟡 In progress (Settings UI, find/replace, recent files done; auto-updater & installer QA remain) |
| 6 | Markdown Guide parity | 🟡 In progress (definition lists, line-start triggers, toolbar blocks, subscript `~`; indent hacks remain) |
