#!/bin/bash

set -euo pipefail

REPOSITORY="fantuan-lab/codex-skin-market"
TAG="bamboo-panda-v0.1.0-beta.1"
BASE="https://github.com/$REPOSITORY/releases"
EXPECTED=(
  "codex-bamboo-panda-macos-beta1.zip"
  "codex-bamboo-panda-windows-beta1.zip"
  "codex-bamboo-panda-SHA256SUMS.txt"
)

command -v gh >/dev/null 2>&1 || { printf 'GitHub CLI is required.\n' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { printf 'curl is required.\n' >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")" && pwd -P)"
TMP="$(/usr/bin/mktemp -d /tmp/codex-bamboo-panda-published.XXXXXX)"
trap '/bin/rm -rf "$TMP"' EXIT

ASSETS="$(gh release view "$TAG" --repo "$REPOSITORY" --json assets --jq '.assets[].name')"
for asset in "${EXPECTED[@]}"; do
  /usr/bin/grep -Fqx "$asset" <<<"$ASSETS" || { printf 'Release asset is missing: %s\n' "$asset" >&2; exit 1; }
  curl -fsSL --retry 3 --retry-delay 1 "$BASE/download/$TAG/$asset" -o "$TMP/$asset"
done
curl -fsSIL --retry 3 --retry-delay 1 "$BASE/tag/$TAG" >/dev/null
/usr/bin/cmp "$ROOT/releases/codex-bamboo-panda-SHA256SUMS.txt" \
  "$TMP/codex-bamboo-panda-SHA256SUMS.txt"
(cd "$TMP" && /usr/bin/shasum -a 256 -c codex-bamboo-panda-SHA256SUMS.txt)

printf 'PASS: Bamboo Panda release page, all public assets, published manifest, and remote ZIP hashes are valid.\n'
