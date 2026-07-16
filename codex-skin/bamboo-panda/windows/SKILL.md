---
name: codex-bamboo-panda-skin
description: Install, launch, verify, repair, or restore the cream-and-bamboo-green Bamboo Panda skin for the Windows Codex desktop app without modifying WindowsApps or app.asar.
---

# Codex 竹影熊猫

Apply a reversible renderer skin through Chromium DevTools Protocol while launching the official Store-installed Codex executable. Never replace or take ownership of files under `WindowsApps`.

## Workflow

1. Run `scripts/install-dream-skin.ps1` once. It safely stops the recorded watcher in the shared compatibility slot, copies this package to the stable directory, backs up Codex desktop appearance, sets `appearanceTheme = "light"`, and creates Bamboo Panda shortcuts.
2. Run `scripts/start-dream-skin.ps1`. Add `-RestartExisting` only when restarting an already-open Codex app is authorized.
3. Run `scripts/verify-dream-skin.ps1 -ScreenshotPath <absolute-path>` after launch. Treat a missing hero, composer, sidebar, injection marker, expected version, or `bamboo-panda-2026` theme ID as failure. The native suggestion count is responsive and may be one to six.
4. Inspect the screenshot against `references/qa-inventory.md`. Verify both the home screen and a normal task before signing off.
5. Run `scripts/restore-dream-skin.ps1 -RestoreBaseTheme -RestartCodex` for customer-facing restore. Add `-Uninstall` only when shortcuts should also be removed.

## Guardrails

- Preserve the official executable, package signature, user threads, plugins, authentication state, and all files under `WindowsApps`.
- Keep the panda image inside the real top banner and decorative photo crop; never use it as a fake whole-window overlay.
- Keep native cards, project selector, navigation and composer live and clickable.
- Keep decorative layers `pointer-events: none`.
- Keep port `9335` and `%LOCALAPPDATA%\CodexMoonSpirit` as the one active compatibility slot. Stop the recorded watcher before replacing its files.
- Only stop a watcher after PID, executable path, command line, injector path, and start time all match.
- Preserve the first pre-skin config backup until `-RestoreBaseTheme` succeeds. Customer-facing Restore must pass both `-RestoreBaseTheme` and `-RestartCodex` so an open app immediately reloads the original shell.
- On Codex updates, rerun install and launch; package discovery must remain dynamic.

## Resources

- `scripts/injector.mjs`: CDP connection, renderer injection, verification, screenshot, and removal
- `assets/dream-skin.css`: light Bamboo Panda visual layer
- `assets/renderer-inject.js`: idempotent DOM integration and cleanup
- `assets/theme.json`: Bamboo Panda theme schema, text and colors
- `assets/panda-reference.png`: original decorative banner
- `references/qa-inventory.md`: functional, visual, restore and collision checks
- `scripts/build-release.ps1` / `scripts/build-release.sh`: Windows and cross-platform customer ZIP builders
