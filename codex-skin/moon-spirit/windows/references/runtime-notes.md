# Runtime notes

- The skin launches the Store-installed `ChatGPT.exe` with `--remote-debugging-port=<port>` and injects through CDP.
- The default production port is `9335`; test instances may use another port plus an isolated `--user-data-dir`.
- CDP is bound to loopback. Do not expose it on a LAN interface.
- The injector polls page targets and reinjects after document loads. In-page route changes use a debounced observer plus a low-frequency safety check to avoid CPU churn during streamed tasks.
- `%LOCALAPPDATA%\CodexMoonSpirit\state.json` records the port, daemon PID, Node path, injector path, and start time. Logs stay in the same directory.
- If Codex is already running without the chosen debugging port, close it first or explicitly use `-RestartExisting`.
- Store updates are supported because the launcher queries `Get-AppxPackage OpenAI.Codex` on every launch.
- The launcher only restarts `ChatGPT.exe` when its executable path exactly matches the current Store package path.
- Node resolution prefers Codex's bundled `cua_node`; any system fallback must be Node 22+ with global `fetch` and `WebSocket`.
