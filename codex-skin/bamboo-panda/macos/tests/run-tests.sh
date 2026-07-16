#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
NODE="${NODE:-/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node}"
[ -x "$NODE" ] || { printf 'Codex bundled Node.js was not found: %s\n' "$NODE" >&2; exit 1; }

while IFS= read -r file; do /bin/bash -n "$file"; done < <(
  /usr/bin/find "$ROOT" -type f \( -name '*.sh' -o -name '*.command' \) \
    ! -path '*/release/*' -print
)
while IFS= read -r file; do "$NODE" --check "$file" >/dev/null; done < <(
  /usr/bin/find "$ROOT/scripts" "$ROOT/assets" -type f \( -name '*.mjs' -o -name '*.js' \) -print
)

if /usr/bin/grep -R -n -E 'dream-skin-skin|DREAM_SKIN_SKIN|1\.0\.0-rc2' \
  "$ROOT/scripts" "$ROOT/assets" >/dev/null; then
  printf 'Legacy release-candidate identifiers remain in runtime files.\n' >&2
  exit 1
fi
if /usr/bin/grep -R -n -E '月影灵编|moon-spirit-2026|MOONLIGHT ONLINE|portal-hero\.png|#8b84ff|#7763c8|#a89be8' \
  "$ROOT/scripts" "$ROOT/assets" >/dev/null; then
  printf 'Moon Spirit branding or palette remains in Bamboo Panda runtime files.\n' >&2
  exit 1
fi
if /usr/bin/grep -R -n -E '(writeFile|rename|copyFile|rm).*app\.asar' "$ROOT/scripts" >/dev/null; then
  printf 'A runtime script appears to mutate app.asar.\n' >&2
  exit 1
fi

/usr/bin/grep -q 'result.themeId === '\''bamboo-panda-2026'\''' "$ROOT/scripts/injector.mjs"
/usr/bin/grep -q "stateArtUrl.startsWith('blob:')" "$ROOT/scripts/injector.mjs"
/usr/bin/grep -q 'port_belongs_to_codex "$port" || return 1' "$ROOT/scripts/common-macos.sh"
/usr/bin/grep -q 'actual_start.*saved_start' "$ROOT/scripts/common-macos.sh"
/usr/bin/grep -q 'temporary/scripts/injector.mjs.*--check-payload' "$ROOT/scripts/install-dream-skin-macos.sh"
if /usr/bin/grep -n -E 'continuing with soft verification|\|\| cdp_http_ready|\*ChatGPT\*\|\*Codex\*\|\*codex\*' \
  "$ROOT/scripts/common-macos.sh" "$ROOT/scripts/start-dream-skin-macos.sh" >/dev/null; then
  printf 'A soft CDP ownership bypass remains in the macOS runtime.\n' >&2
  exit 1
fi

BUNDLED_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload)"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.version !== "1.2.0-beta.1" || value.themeId !== "bamboo-panda-2026" || value.themeName !== "竹影熊猫" || value.imageBytes < 100000) process.exit(1);
' "$BUNDLED_JSON"
[ -s "$ROOT/assets/panda-hero.png" ]
IMAGE_BYTES="$(/usr/bin/stat -f '%z' "$ROOT/assets/panda-hero.png")"
[ "$IMAGE_BYTES" -le 16777216 ]

TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-skin-tests.XXXXXX)"
cleanup() {
  [ -z "${STRANGER_PID:-}" ] || /bin/kill "$STRANGER_PID" 2>/dev/null || true
  [ -z "${VALID_PID:-}" ] || /bin/kill "$VALID_PID" 2>/dev/null || true
  /bin/rm -rf "$TMP"
}
trap cleanup EXIT
/bin/mkdir -p "$TMP/theme"
/bin/cp "$ROOT/assets/panda-hero.png" "$TMP/theme/background.png"
"$NODE" "$ROOT/scripts/write-theme.mjs" custom --output-dir "$TMP/theme" \
  --image background.png --name '测试主题' --tagline '测试口号' --quote 'TEST' \
  --accent '#11aa55' --secondary '#22bbcc' --highlight '#663399' >/dev/null
PAYLOAD_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload --theme-dir "$TMP/theme")"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.themeName !== "测试主题" || value.imageBytes < 1) process.exit(1);
' "$PAYLOAD_JSON"
"$NODE" "$ROOT/scripts/write-theme.mjs" reset-demo --output-dir "$TMP/theme" >/dev/null
[ ! -e "$TMP/theme" ]

# A new skin shares the existing runtime slot: preserve the prior active theme,
# register Bamboo Panda in themes/, and atomically activate it in theme/.
STATE_ROOT="$TMP/state"
/bin/mkdir -p "$STATE_ROOT/theme"
/bin/cp "$ROOT/assets/panda-hero.png" "$STATE_ROOT/theme/old.png"
/usr/bin/printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  '  "id": "existing-theme",' \
  '  "name": "原主题",' \
  '  "image": "old.png",' \
  '  "colors": {}' \
  '}' > "$STATE_ROOT/theme/theme.json"
CODEX_DREAM_SKIN_STATE_ROOT="$STATE_ROOT" NODE="$NODE" \
  "$ROOT/scripts/activate-bundled-panda-macos.sh" >/dev/null
ACTIVE_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload --theme-dir "$STATE_ROOT/theme")"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.themeId !== "bamboo-panda-2026" || value.themeName !== "竹影熊猫") process.exit(1);
' "$ACTIVE_JSON"
[ -s "$STATE_ROOT/themes/bamboo-panda-2026/panda-hero.png" ]
BACKUP_ID="$(/usr/bin/tr -d '[:space:]' < "$STATE_ROOT/last-pre-panda-theme.txt")"
[ -s "$STATE_ROOT/themes/$BACKUP_ID/theme.json" ]
/usr/bin/grep -q '"id": "existing-theme"' "$STATE_ROOT/themes/$BACKUP_ID/theme.json"
BACKUP_COUNT_BEFORE="$(/usr/bin/find "$STATE_ROOT/themes" -maxdepth 1 -type d -name 'pre-panda-*' | /usr/bin/wc -l | /usr/bin/awk '{$1=$1;print}')"
CODEX_DREAM_SKIN_STATE_ROOT="$STATE_ROOT" NODE="$NODE" \
  "$ROOT/scripts/activate-bundled-panda-macos.sh" >/dev/null
BACKUP_COUNT_AFTER="$(/usr/bin/find "$STATE_ROOT/themes" -maxdepth 1 -type d -name 'pre-panda-*' | /usr/bin/wc -l | /usr/bin/awk '{$1=$1;print}')"
[ "$BACKUP_COUNT_BEFORE" = "1" ] && [ "$BACKUP_COUNT_AFTER" = "1" ]

CONFIG="$TMP/config.toml"
BACKUP="$TMP/theme-backup.json"
/usr/bin/printf '%s\n' \
  'model = "gpt-5"' \
  '' \
  '[desktop]' \
  'appearanceTheme = "system"' \
  'appearanceDarkCodeThemeId = "vscode-dark"' \
  'keepMe = true' > "$CONFIG"
/bin/cp "$CONFIG" "$TMP/original.toml"
"$NODE" "$ROOT/scripts/theme-config.mjs" install "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/grep -q '^appearanceTheme = "light"$' "$CONFIG"
/usr/bin/grep -q '^keepMe = true$' "$CONFIG"
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"

/usr/bin/env -u HOME /bin/bash -c '. "$1/scripts/common-macos.sh"; [ -n "$HOME" ] && [ "$SKIN_VERSION" = "1.2.0-beta.1" ]' _ "$ROOT"
"$ROOT/scripts/doctor-macos.sh" >/dev/null

# A corrupted state that only contains a live PID must fail closed and must not
# terminate that unrelated process.
/bin/sleep 2 &
STRANGER_PID="$!"
FAIL_CLOSED_HOME="$TMP/fail-closed-home"
/bin/mkdir -p "$FAIL_CLOSED_HOME/Library/Application Support/CodexDreamSkinStudio"
/usr/bin/printf '{"injectorPid":%s}\n' "$STRANGER_PID" \
  > "$FAIL_CLOSED_HOME/Library/Application Support/CodexDreamSkinStudio/state.json"
HOME="$FAIL_CLOSED_HOME" NODE="$NODE" /bin/bash -c '
  . "$1/scripts/common-macos.sh"
  if stop_recorded_injector; then exit 1; fi
  /bin/kill -0 "$2"
' _ "$ROOT" "$STRANGER_PID"
/bin/wait "$STRANGER_PID" 2>/dev/null || true
STRANGER_PID=""

# A bundle-fallback restore may safely stop a watcher recorded at the one fixed
# install path, but only when the signed Node path, full command prefix, PID,
# and process start time all match the saved state.
VALID_HOME="$TMP/valid-home"
VALID_STATE_ROOT="$VALID_HOME/Library/Application Support/CodexDreamSkinStudio"
VALID_INJECTOR="$VALID_HOME/.codex/codex-dream-skin-studio/scripts/injector.mjs"
/bin/mkdir -p "$VALID_STATE_ROOT" "$(/usr/bin/dirname "$VALID_INJECTOR")"
/usr/bin/printf '%s\n' \
  'process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 1000);' \
  > "$VALID_INJECTOR"
"$NODE" "$VALID_INJECTOR" --watch --port 9341 &
VALID_PID="$!"
/bin/sleep 0.2
VALID_START="$(/bin/ps -p "$VALID_PID" -o lstart= | /usr/bin/awk '{$1=$1; print}')"
"$NODE" -e '
  const fs = require("node:fs");
  const [file, pid, startedAt, nodePath, injectorPath] = process.argv.slice(1);
  fs.writeFileSync(file, `${JSON.stringify({
    injectorPid: Number(pid), injectorStartedAt: startedAt, nodePath, injectorPath
  })}\n`, {mode: 0o600});
' "$VALID_STATE_ROOT/state.json" "$VALID_PID" "$VALID_START" "$NODE" "$VALID_INJECTOR"
HOME="$VALID_HOME" NODE="$NODE" /bin/bash -c '
  . "$1/scripts/common-macos.sh"
  [ "$INJECTOR" != "$2" ]
  stop_recorded_injector
' _ "$ROOT" "$VALID_INJECTOR" "$VALID_PID"
/bin/wait "$VALID_PID" 2>/dev/null || true
! /bin/kill -0 "$VALID_PID" 2>/dev/null
VALID_PID=""

printf 'PASS: syntax, bundled 竹影熊猫 payload, strict CDP/PID identity and fallback stop, shared-slot backup/activation, light-theme round-trip, custom theme, HOME recovery, signature, and doctor checks.\n'
