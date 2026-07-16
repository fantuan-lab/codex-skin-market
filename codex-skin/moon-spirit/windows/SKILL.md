---
name: codex-moon-spirit-skin
description: Apply, launch, verify, repair, update, or restore the blue-violet Moon Spirit skin for the Windows Codex desktop app without modifying WindowsApps or app.asar.
---

# Codex 月影灵编

Apply a reversible renderer skin through Chromium DevTools Protocol while launching the official Store-installed Codex executable. Never replace or take ownership of files under `WindowsApps`.

## Workflow

1. Run `scripts/install-dream-skin.ps1` once to copy the engine to a stable path, back up the current config, and create launch/restore shortcuts. Installation does not change the user's base appearance theme.
2. Run `scripts/start-dream-skin.ps1`. Add `-RestartExisting` only when the user authorized restarting an already-open Codex app.
3. Run `scripts/verify-dream-skin.ps1 -ScreenshotPath <absolute-path>` after launch. Treat a missing hero, native composer, sidebar skin, injection marker, expected version, or `moon-spirit-2026` theme ID as failure. The native suggestion count is responsive and may be one to six.
4. Inspect the screenshot against `references/qa-inventory.md`. Verify both the home screen and a normal task before signing off.
5. Run `scripts/restore-dream-skin.ps1` for live removal. Add `-Uninstall` to delete shortcuts; add `-RestoreBaseTheme` when the user also wants the pre-install config backup restored.

## Guardrails

- Preserve the official executable, package signature, user threads, pets, plugins, and authentication state.
- Do not use the artwork as a fake whole-window overlay. It is only a hero/polaroid asset; all controls remain live Codex controls.
- Keep the moon-spirit image confined to the single top banner and decorative crop. Keep the cards below it as native Codex suggestion buttons with native labels/icons.
- Attach the "选择项目" treatment to Codex's real project-selector toolbar and keep the current project button clickable; never draw a disconnected replacement.
- Keep decorative layers `pointer-events: none` and keep real buttons, navigation, and composer above them.
- On app updates, rerun install and launch; the scripts discover the current Appx package dynamically.
- If port `9335` is occupied, choose another port consistently for start, verify, and restore.
- Keep the injection daemon running for navigation/reload resilience. Its state and logs live under `%LOCALAPPDATA%\CodexMoonSpirit`.
- Only stop a recorded injector after PID, executable path, command line, injector path, and start time all match.

## Resources

- `scripts/injector.mjs`: CDP connection, renderer injection, verification, screenshot, and removal.
- `assets/dream-skin.css`: full visual layer.
- `assets/renderer-inject.js`: idempotent DOM integration and cleanup.
- `assets/theme.json`: shared macOS/Windows Moon Spirit theme schema and text/color configuration.
- `assets/dream-reference.png`: original Moon Spirit artwork used only in cropped decorative regions.
- `references/qa-inventory.md`: required functional and visual signoff coverage.
- `references/runtime-notes.md`: troubleshooting and update behavior.
