# MD — Implementation Checklist

Track what is **done**, **partial**, or **not started**. Last updated to match the codebase at v0.1.0.

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
| ⬜ | Settings / Preferences UI | Config fields exist but no dialog to edit them |
| ✅ | Portable mode detection | `MD/portable.flag` next to executable |
| ✅ | Installed storage path | `%APPDATA%\MD\` |
| ✅ | `.md` file association | `tauri.conf.json` bundle |
| 🟡 | Production installer | NSIS config present; not fully QA'd |
| ✅ | About dialog | Version 0.1.0 |
| ✅ | Exit application | Menu + Tauri `exit_app` |
| ✅ | Window title reflects dirty state | `AppShell.tsx` |
| ⬜ | Recent files list | — |
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
| ⬜ | Toggle wrap from UI | Config only; no menu control |
| ✅ | Status bar | Path, UTF-8, save state, wrap, zoom |
| ✅ | System / light / dark theme | `config.theme` → `data-theme` |
| ⬜ | Theme picker in UI | Config only |
| ✅ | Placeholder hint | "Start writing, or press / for commands…" |
| ✅ | Print | `Ctrl+P`; basic HTML print window |
| ⬜ | Find / replace | — |

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
| 🟡 | Multi-color highlight | Extension supports multicolor | Toolbar only toggles default highlight |
| ✅ | Emoji shortcode | `:name:` | gemoji lookup |
| 🟡 | Emoji save mode | `config.emojiSaveMode` | Config stored; serialization not differentiated |
| ⬜ | Subscript typing | — | Extension loaded; no input rule / slash entry |
| ⬜ | Superscript typing | — | Extension loaded; no input rule / slash entry |

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
| 🟡 | Fenced code + language | TipTap default | No ` ```lang ` line-start trigger verified |
| 🟡 | Tables | TipTap table extension | Edit in WYSIWYG; no slash insert / markdown trigger |
| 🟡 | Images | TipTap image extension | No insert UI, URL rule, or drag-drop |
| ⬜ | Definition lists | — | Not implemented |
| ✅ | Paragraphs | Default | |

---

## Slash menu (`/`)

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Opens at cursor | Fixed positioning (no off-screen / spurious newline) |
| ✅ | Filter as you type | Prefix matching |
| ✅ | Keyboard navigation | ↑↓ Enter Esc |
| ✅ | Formatting section | From `markRegistry` |
| ✅ | Blocks section | Headings, lists, quote, code, HR |
| ✅ | Emoji submenu | Preset grid |
| ⬜ | Table insert | — |
| ⬜ | Image insert | — |
| ⬜ | Link insert | — |

---

## Selection toolbar

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Appears on text selection | Custom portal toolbar (not static bar) |
| ✅ | Bold / italic / strike / highlight / underline / code | Via `markRegistry` |
| ✅ | Text color swatches | Preset colors + reset |
| ⬜ | Highlight color swatches | — |
| ⬜ | Heading / list / quote actions | Spec mentioned Word-like bar; not implemented |
| ⬜ | Link edit / remove | — |

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
| ⬜ | External link visual indicator | README backlog (e.g. 🔗 superscript) |
| ⬜ | Inline link title editing | — |

---

## Footnotes

| Status | Item | Notes |
|--------|------|-------|
| ✅ | `[^id]` reference mark | Input rules (inline + line-start) |
| ✅ | `[^id]:` definition block | Multiline body support |
| 🟡 | Footnote defs in WYSIWYG | Visible with label styling; unlike link refs (hidden) |
| ⬜ | Footnote preview / jump UI | — |

---

## Markdown fidelity

| Status | Item | Notes |
|--------|------|-------|
| ✅ | GFM core via TipTap StarterKit + extensions | |
| ✅ | Markdown round-trip (editor ↔ string) | `@tiptap/markdown` |
| ✅ | Markdown paste (plain text) | `markdownPaste.ts` |
| ✅ | Colored text in raw pane | HTML span serialization |
| 🟡 | Markdown Guide — basic syntax | Most covered; gaps: images, some link variants |
| 🟡 | Markdown Guide — extended syntax | Tables/tasks/strike/footnote partial |
| ⬜ | Markdown Guide — hacks | Underline, sub/sup, definition lists, etc. |
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
| 🟡 | Undo | TipTap history (StarterKit); `Ctrl+Z` |
| 🟡 | Redo | History plugin present; explicit `Ctrl+Y` / `Ctrl+Shift+Z` not documented in shortcuts |
| ⬜ | Full history polish | README backlog — verify deep stacks & redo UX |

---

## Updates & distribution

| Status | Item | Notes |
|--------|------|-------|
| 🟡 | `checkUpdates` config flag | Stored; no updater logic |
| ⬜ | Tauri auto-updater plugin | Not in `tauri.conf.json` plugins |
| ⬜ | Manual download / release notes link | — |
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

---

## Suggested next priorities

1. **Settings dialog** — Expose `AppConfig`; unblocks theme, session, wrap, updates prefs.
2. **External link indicator** — Small visual affordance for off-site URLs.
3. **Slash menu: image & table** — Highest-impact Markdown Guide gaps.
4. **Selection toolbar: link + highlight colors** — Completes formatting bar spec.
5. **Auto-updater** — Required for v1 release story.
6. **Automated round-trip tests** — Lock in reference-definition and footnote behavior.

---

## Quick phase summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Shell, tabs, I/O, session, raw pane, zoom | ✅ Complete |
| 2 | Inline delimiters, slash menu, selection bar | ✅ Complete |
| 3 | Colors, emoji, Shiki, paste, polish | ✅ Complete |
| 4 | Links, refs, footnotes, print, stability | 🟡 In progress |
| 5 | Settings, updates, release QA | ⬜ Planned |
| 6 | Markdown Guide parity | ⬜ Planned |
