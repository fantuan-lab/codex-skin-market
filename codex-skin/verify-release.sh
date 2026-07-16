#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$ROOT/.." && pwd -P)"
MAC_ROOT="$ROOT/moon-spirit/macos"
WINDOWS_ROOT="$ROOT/moon-spirit/windows"
MAC_ZIP="$ROOT/releases/codex-moon-spirit-macos-beta1.zip"
WINDOWS_ZIP="$ROOT/releases/codex-moon-spirit-windows-beta1.zip"
CODEX_NODE="/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node"

if [ ! -x "$CODEX_NODE" ]; then
  CODEX_NODE="$(command -v node)"
fi

(cd "$MAC_ROOT" && ./tests/run-tests.sh)
"$CODEX_NODE" "$WINDOWS_ROOT/tests/static-check.mjs"
/usr/bin/unzip -t "$MAC_ZIP" >/dev/null
/usr/bin/unzip -t "$WINDOWS_ZIP" >/dev/null
(cd "$PROJECT_ROOT" && /usr/bin/shasum -a 256 -c codex-skin/releases/SHA256SUMS.txt)

if /usr/bin/grep -R -n -E 'Fiona Sit|薛凯琪|Passion8|passion8|安装 Codex 主题编辑器|background-20260715' \
  "$MAC_ROOT/assets" "$MAC_ROOT/client-delivery" "$WINDOWS_ROOT/assets" "$WINDOWS_ROOT/README.md" >/dev/null; then
  printf 'Legacy theme or sponsor content remains in a customer-facing path.\n' >&2
  exit 1
fi

/usr/bin/printf '%s\n' \
  'PASS: macOS source/runtime tests, Windows static tests, ZIP CRC, SHA-256, and legacy-content scan.' \
  'NOTE: this does not replace live macOS/Windows Codex UI acceptance.'
