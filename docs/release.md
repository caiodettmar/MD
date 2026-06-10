# MD — Release & distribution

Guide for building installers, portable bundles, manual updates, and smoke-testing on a clean Windows machine.

## Build

From the repository root:

```bash
npm install
npm run tauri:build
```

Artifacts are written under `src-tauri/target/release/bundle/`:

| Target | Output |
|--------|--------|
| NSIS | `nsis/MD_<version>_x64-setup.exe` |
| MSI (optional) | `msi/MD_<version>_x64_en-US.msi` |

`bundle.targets` is set to `"all"` in `tauri.conf.json`, so both NSIS and MSI are produced when the WiX toolchain is available.

### Version sources

Keep these in sync when bumping a release:

- `package.json` → `"version"`
- `src-tauri/Cargo.toml` → `version`
- `src-tauri/tauri.conf.json` → `"version"`

The UI reads the npm version at build time via Vite (`__APP_VERSION__`).

## Installed vs portable mode

| Mode | Storage root | How to enable |
|------|--------------|---------------|
| **Installed** (default) | `%APPDATA%\MD\` | Run the NSIS installer or launch the installed `.exe` |
| **Portable** | `{exe_dir}\MD\` | Create an empty file `{exe_dir}\MD\portable.flag` next to the executable |

Portable detection is implemented in `src-tauri/src/file_ops.rs` (`storage_root`). Both modes store:

- `config.json` — user preferences (`AppConfig`)
- `session/` — tab snapshots for session restore

To ship a portable zip: copy the release `.exe` (and any sidecar DLLs from the bundle folder), create `MD/portable.flag`, and distribute the folder.

## NSIS installer configuration

Current settings in `src-tauri/tauri.conf.json`:

| Setting | Value | Effect |
|---------|-------|--------|
| `identifier` | `com.caio.md` | App identity for Windows / updates |
| `installMode` | `both` | Installer prompts: **current user** or **all users (per-machine)** |
| `fileAssociations` | `.md`, `.markdown` | Registers MD as an editor for Markdown files |
| `webviewInstallMode` | `downloadBootstrapper` (default) | Downloads WebView2 bootstrapper if missing |

**Per-user install** — No admin rights; installs under `%LOCALAPPDATA%\Programs\…`.

**Per-machine install** — Requires elevation; installs under `Program Files`.

Desktop and Start Menu shortcuts are created by the default NSIS template.

### Not yet configured (post-v1 release engineering)

- **Code signing** — `bundle.windows.certificateThumbprint` / `signCommand` are unset; Windows SmartScreen may warn on first run.
- **Auto-updater** — `tauri-plugin-updater` is not wired; see [Manual updates](#manual-updates) below.

## Manual updates

Until a signed auto-update endpoint exists:

1. **Help → Check for Updates…** — Opens the update dialog with the running version and a **View releases** link.
2. Download the latest `MD_*_x64-setup.exe` from [GitHub Releases](https://github.com/caiodettmar/md/releases).
3. Close MD, run the new installer (or replace the portable `.exe`), and relaunch.

Settings → **Check for updates on startup** runs a console-only stub (`runStartupUpdateCheck` in `src/lib/updateCheck.ts`). It does not download or install anything.

### Enabling auto-update later

1. Add `tauri-plugin-updater` to `src-tauri/Cargo.toml` and register it in `lib.rs`.
2. Set `plugins.updater` in `tauri.conf.json` with a `endpoints` URL and `pubkey` from `tauri signer generate`.
3. Publish update manifests (`.json` + signatures) on each release.
4. Set `bundle.createUpdaterArtifacts` to `true` in CI.

Do not enable the plugin without signing keys and a release server — the build will fail or users will see broken update prompts.

## Smoke-test checklist (clean Windows VM)

Use a fresh Windows 10/11 VM without dev tools installed.

### NSIS installer (per-user)

- [ ] Run `MD_*_x64-setup.exe`; choose **current user** if prompted.
- [ ] App launches; window title shows `MD` or document name.
- [ ] **File → Open** opens a `.md` file; content renders in WYSIWYG.
- [ ] Double-click a `.md` file in Explorer — MD opens (association).
- [ ] Edit text, **Ctrl+S** saves; dirty indicator clears.
- [ ] **File → Settings** (`Ctrl+,`) — change theme; UI updates immediately.
- [ ] Enable **Show raw markdown on startup**; restart — raw pane visible.
- [ ] **Help → Check for Updates** — dialog shows version and releases link.
- [ ] **Help → About MD** — version matches installer build.
- [ ] Close and reopen — session tabs restore (default **Restore session** on).

### NSIS installer (per-machine)

- [ ] Reinstall choosing **all users**; confirm install under `Program Files`.
- [ ] Shortcuts work for a non-admin test account (if applicable).

### Portable mode

- [ ] Copy portable folder to a writeable path (e.g. `D:\MD-portable\`).
- [ ] Create `MD\portable.flag`; launch `.exe`.
- [ ] Save a file and confirm `%APPDATA%` is **not** used (`config.json` under `{exe}\MD\`).
- [ ] Move folder to another drive; settings and session persist.

### Regression spot-checks

- [ ] **Ctrl+F** / **Ctrl+H** find and replace in active tab.
- [ ] **File → Open Recent** lists last opened paths.
- [ ] **Ctrl+P** print preview opens without error.
- [ ] External `http(s)` link click shows confirmation dialog.

## Local verification before release

```bash
npx tsc --noEmit
npm run build
cd src-tauri && cargo check
```

Optional full bundle on a Windows host with NSIS + WiX prerequisites installed:

```bash
npm run tauri:build
```
