# QA inventory

## User-visible claims

1. The home screen visibly matches Bamboo Panda: a cream-and-bamboo-green shell, one cropped panda hero, bamboo/footprint details, native suggestion cards, decorative photo, project selector and skinned native composer.
2. The sidebar and main surface are pale warm neutrals with readable olive text, not a blue-violet recolor.
3. All real Codex controls remain interactive; the skin is not a screenshot overlay.
4. The skin survives route changes and renderer reloads while the watcher runs.
5. The official Store package and `app.asar` remain unchanged.
6. Install sets the desktop appearance to light; customer Restore returns the exact backed-up appearance keys.

## Functional checks

- Extract the ZIP and run `Install Bamboo Panda.cmd`; confirm it refuses unsafe stale-process identity rather than running two watchers.
- Confirm `appearanceTheme = "light"` is present under `[desktop]` and unrelated TOML remains byte-for-byte logically unchanged.
- Launch from `Codex 竹影熊猫`; verify only the current official Store executable is restarted.
- Home feature card: click a native card and confirm its normal Codex action.
- Project selector: click the real project chip and confirm the native project menu opens.
- Sidebar: open a real task and return to New Task.
- Composer: type and clear text without sending; verify caret and control contrast.
- Reload with CDP `Page.reload`; confirm the injection marker returns.
- Run `Verify Bamboo Panda.cmd`; require version `1.2.0-bamboo-panda-beta.1` and theme ID `bamboo-panda-2026`.
- Run `Restore Bamboo Panda.cmd`; require injected DOM/CSS absent, original appearance keys restored, and an already-open official Codex restarted without CDP arguments. Confirm the backup is removed only after success.
- Reinstall after restore and confirm a new baseline backup is created.

## Single-slot and process safety

- Start an older skin in `%LOCALAPPDATA%\CodexMoonSpirit`, then install Bamboo Panda. Confirm the old watcher is stopped before files are replaced and only one watcher remains.
- A fake/reused PID, wrong Node path, wrong injector path, missing `--watch`, or start-time mismatch must refuse termination and abort installation/start/restore.
- An unrelated process on port 9335 must not pass `Test-CodexDebugPort`.
- Reject non-`127.0.0.1` WebSocket URLs, mismatched ports, non-`app://` pages, and targets without Codex shell/sidebar markers.
- `-Uninstall` removes Bamboo Panda shortcuts and stale compatibility shortcuts, but never user projects or official Codex files.

## Visual checks

- 1280×820 home: hero, one to six responsive native cards, project selector and composer fit without horizontal scrolling.
- Narrow window: two or three cards are acceptable; the decorative photo may hide but no essential control may be covered.
- Hero focal point preserves the panda; text remains readable over the left gradient.
- Normal task: messages, code, diffs and composer remain readable with no overlapping decorations.
- Inspect sidebar, header, hero edges, card labels/icons, composer controls, scrollbar, footprints, bamboo leaves and bottom-right photo.
- Reject clipped cards, duplicate project labels, black/transparent artifacts, blue-violet leftovers, pointer interception or fake rasterized controls.

## Release checks

- Run `node tests/static-check.mjs` with Node 22+.
- Run `scripts/build-release.ps1` on Windows or `scripts/build-release.sh` on a Unix build host; test ZIP CRC and inspect the top-level launchers.
- Perform the full install → launch → verify → screenshot → restore cycle on Windows 10 and Windows 11 before describing the package as production-ready.
