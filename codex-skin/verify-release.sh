#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$ROOT/.." && pwd -P)"
CODEX_NODE="/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node"

if [ ! -x "$CODEX_NODE" ]; then
  CODEX_NODE="$(command -v node)"
fi

MAC_ROOTS=(
  "$ROOT/moon-spirit/macos"
  "$ROOT/bamboo-panda/macos"
)
WINDOWS_ROOTS=(
  "$ROOT/moon-spirit/windows"
  "$ROOT/bamboo-panda/windows"
)
RELEASE_ZIPS=(
  "$ROOT/releases/codex-moon-spirit-macos-beta1.zip"
  "$ROOT/releases/codex-moon-spirit-windows-beta1.zip"
  "$ROOT/releases/codex-bamboo-panda-macos-beta1.zip"
  "$ROOT/releases/codex-bamboo-panda-windows-beta1.zip"
)

for mac_root in "${MAC_ROOTS[@]}"; do
  (cd "$mac_root" && ./tests/run-tests.sh)
done

for windows_root in "${WINDOWS_ROOTS[@]}"; do
  "$CODEX_NODE" "$windows_root/tests/static-check.mjs"
done

for archive in "${RELEASE_ZIPS[@]}"; do
  [ -f "$archive" ] || { printf 'Missing release archive: %s\n' "$archive" >&2; exit 1; }
  /usr/bin/unzip -t "$archive" >/dev/null
done

(cd "$PROJECT_ROOT" && /usr/bin/shasum -a 256 -c codex-skin/releases/SHA256SUMS.txt)
(cd "$ROOT/releases" && /usr/bin/shasum -a 256 -c codex-bamboo-panda-SHA256SUMS.txt)

# Rebuild the two Panda customer packages from the current source and compare
# extracted contents. This prevents a valid-but-stale ZIP from being released
# after runtime or safety fixes land in source.
PACKAGE_CHECK="$(/usr/bin/mktemp -d /tmp/codex-bamboo-panda-release-check.XXXXXX)"
trap '/bin/rm -rf "$PACKAGE_CHECK"' EXIT
"$ROOT/bamboo-panda/macos/scripts/build-client-release.sh" "$PACKAGE_CHECK/fresh-macos.zip" >/dev/null
"$ROOT/bamboo-panda/windows/scripts/build-release.sh" "$PACKAGE_CHECK/windows-build" >/dev/null
FRESH_WINDOWS="$PACKAGE_CHECK/windows-build/Codex-Bamboo-Panda-Windows-$(/usr/bin/tr -d '\r\n' < "$ROOT/bamboo-panda/windows/VERSION").zip"
/bin/mkdir -p \
  "$PACKAGE_CHECK/fresh-macos" "$PACKAGE_CHECK/release-macos" \
  "$PACKAGE_CHECK/fresh-windows" "$PACKAGE_CHECK/release-windows"
/usr/bin/ditto -x -k "$PACKAGE_CHECK/fresh-macos.zip" "$PACKAGE_CHECK/fresh-macos"
/usr/bin/ditto -x -k "$ROOT/releases/codex-bamboo-panda-macos-beta1.zip" "$PACKAGE_CHECK/release-macos"
/usr/bin/ditto -x -k "$FRESH_WINDOWS" "$PACKAGE_CHECK/fresh-windows"
/usr/bin/ditto -x -k "$ROOT/releases/codex-bamboo-panda-windows-beta1.zip" "$PACKAGE_CHECK/release-windows"
/usr/bin/diff -qr "$PACKAGE_CHECK/fresh-macos" "$PACKAGE_CHECK/release-macos"
/usr/bin/diff -qr "$PACKAGE_CHECK/fresh-windows" "$PACKAGE_CHECK/release-windows"

if /usr/bin/grep -R -n -E 'Fiona Sit|薛凯琪|Passion8|passion8|安装 Codex 主题编辑器|background-20260715' \
  "${MAC_ROOTS[@]/%//assets}" \
  "${WINDOWS_ROOTS[@]/%//assets}" >/dev/null; then
  printf 'Legacy theme or sponsor content remains in a customer-facing asset path.\n' >&2
  exit 1
fi

if /usr/bin/grep -R -n -E '月影灵编|Moon Spirit|MOONLIGHT|moon-spirit-2026|portal-hero\.png|dream-reference\.png' \
  "$ROOT/bamboo-panda/macos/assets" \
  "$ROOT/bamboo-panda/macos/client-delivery" \
  "$ROOT/bamboo-panda/macos/README.md" \
  "$ROOT/bamboo-panda/windows/assets" \
  "$ROOT/bamboo-panda/windows/README.md" >/dev/null; then
  printf 'Moon Spirit branding remains in a Bamboo Panda customer-facing path.\n' >&2
  exit 1
fi

/usr/bin/printf '%s\n' \
  'PASS: two skins, macOS source/runtime tests, Windows static tests, ZIP CRC, SHA-256, and legacy-content scans.' \
  'PASS: Panda customer ZIP contents match fresh builds from the current source.' \
  'NOTE: automated checks do not replace live macOS/Windows Codex UI acceptance.'
