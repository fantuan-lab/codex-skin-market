# Runtime notes

- The skin launches Store-installed `ChatGPT.exe` with `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9335` and injects through CDP.
- `%LOCALAPPDATA%\CodexMoonSpirit` is deliberately retained as a shared, single-active compatibility slot. Installing Bamboo Panda stops the recorded watcher before replacing `app`.
- `%LOCALAPPDATA%\CodexMoonSpirit\state.json` records port, daemon PID, Node path, injector path, start time, theme ID and skin version. Logs stay beside it.
- The installer preserves the first pre-skin `config.toml` snapshot and sets only `appearanceTheme = "light"` in the live desktop section.
- Customer-facing Restore passes `-RestoreBaseTheme -RestartCodex`; after successful restoration the backup is deleted so a future install captures a fresh baseline. If Codex was open, the exact Store executable is restarted without CDP arguments.
- The injector polls verified `app://` page targets and reinjects after document loads. In-page mutations are debounced plus a low-frequency safety check.
- Store updates are supported because every launch queries `Get-AppxPackage OpenAI.Codex`; no versioned WindowsApps path is stored.
- The launcher only restarts `ChatGPT.exe` when its executable path exactly matches the current Store package path.
- Node resolution prefers Codex's bundled `cua_node`; any system fallback must be Node 22+ with global `fetch` and `WebSocket`.
- Restoring live CSS does not close Codex. The 9335 debug listener remains until Codex exits.
