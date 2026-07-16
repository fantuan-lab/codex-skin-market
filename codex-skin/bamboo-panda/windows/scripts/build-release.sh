#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(tr -d '\r\n' < "$ROOT/VERSION")"
if [[ ! "$VERSION" =~ ^[0-9A-Za-z][0-9A-Za-z._-]+$ ]]; then
  printf 'Invalid VERSION value: %s\n' "$VERSION" >&2
  exit 1
fi

OUTPUT_DIRECTORY="${1:-$ROOT/dist}"
mkdir -p "$OUTPUT_DIRECTORY"
OUTPUT_DIRECTORY="$(cd "$OUTPUT_DIRECTORY" && pwd -P)"
PACKAGE_NAME="Codex-Bamboo-Panda-Windows-$VERSION"
ARCHIVE="$OUTPUT_DIRECTORY/$PACKAGE_NAME.zip"
CHECKSUM="$ARCHIVE.sha256"
STAGING="$(mktemp -d "${TMPDIR:-/tmp}/codex-bamboo-panda.XXXXXX")"
PACKAGE_ROOT="$STAGING/$PACKAGE_NAME"
trap 'rm -rf "$STAGING"' EXIT

NODE_BIN="${CODEX_NODE:-}"
if [[ -z "$NODE_BIN" ]]; then
  if [[ -x /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node ]]; then
    NODE_BIN=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node
  else
    NODE_BIN="$(command -v node)"
  fi
fi
"$NODE_BIN" "$ROOT/tests/static-check.mjs"

mkdir -p "$PACKAGE_ROOT"
for folder in assets scripts references tests agents; do
  cp -R "$ROOT/$folder" "$PACKAGE_ROOT/$folder"
done
for file in \
  'Install Bamboo Panda.cmd' \
  'Start Bamboo Panda.cmd' \
  'Verify Bamboo Panda.cmd' \
  'Restore Bamboo Panda.cmd' \
  README.md LICENSE NOTICE.md SOURCE.md ARTWORK-LICENSE.md SKILL.md VERSION; do
  cp "$ROOT/$file" "$PACKAGE_ROOT/$file"
done

for required in \
  'Install Bamboo Panda.cmd' \
  'Start Bamboo Panda.cmd' \
  'Verify Bamboo Panda.cmd' \
  'Restore Bamboo Panda.cmd' \
  'assets/panda-reference.png' \
  'scripts/injector.mjs'; do
  test -f "$PACKAGE_ROOT/$required"
done

rm -f "$ARCHIVE" "$CHECKSUM"
(cd "$STAGING" && COPYFILE_DISABLE=1 zip -X -qry "$ARCHIVE" "$PACKAGE_NAME")
unzip -t "$ARCHIVE" >/dev/null

if command -v shasum >/dev/null 2>&1; then
  HASH="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
else
  HASH="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
fi
printf '%s  %s\n' "$HASH" "$(basename "$ARCHIVE")" > "$CHECKSUM"
printf 'Release archive: %s\nSHA-256: %s\n' "$ARCHIVE" "$HASH"
